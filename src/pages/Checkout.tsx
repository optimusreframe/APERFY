import { useState, useEffect, useMemo, useRef, ReactNode, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageCircle, Send, CreditCard, CheckCircle2, ExternalLink, Truck, Shield, Clock, ChevronDown, Lock, Check, ArrowLeft, Zap, Cog, Package, Search, MapPin, ChevronUp } from 'lucide-react';
import { checkoutSchema, paymentMethodSchema, MAX_ORDER_ITEMS, MAX_ITEM_QUANTITY } from '@/lib/validation';
import { checkRateLimit, formatRetryTime } from '@/lib/rate-limit';
import { buildOrderInsert, getCheckoutErrorMessage, getCheckoutHandoffUrl } from '@/lib/checkout';
import { CartThumbnailImage } from '@/components/CartThumbnailImage';
import { getCountryName, getCountryOptions, getStatesForCountry } from '@/lib/location-data';
import { detectCountryFromIp, getPhoneCountryOptions, isCheckoutPhoneValid, normalizePhoneForCountry } from '@/lib/phone';
import { searchAddress } from '@/lib/address-search';
import type { AddressSuggestion } from '@/lib/geocoding';
import { CHECKOUT_PAYMENT_KEYS, getPaymentChannelDescription, parsePaymentChannelSetting, paymentChannelFromKey, type CheckoutPaymentChannel } from '@/lib/payment-channels';

type Step = 'shipping' | 'method' | 'payment-instructions' | 'channel-sent';
type Section = 'contact' | 'address' | 'shipping';

interface PaymentConfig {
  active: boolean;
  label: string;
  description_en?: string;
  description_es?: string;
  info: string;
  instructions: string;
}

interface ShippingProvider {
  id: string;
  name: string;
  description_en: string;
  description_es: string;
  base_rate: number;
  per_kg_rate: number;
  estimated_days_min: number;
  estimated_days_max: number;
}

const ONLINE_PAYMENTS_ENABLED = false;
const ONLINE_PAYMENT_KEYS = ['payment_zelle', 'payment_binance', 'payment_cashapp'] as const;
const PAYMENT_SETTING_KEYS = [...CHECKOUT_PAYMENT_KEYS, ...ONLINE_PAYMENT_KEYS] as const;
const CHECKOUT_HANDOFF_STORAGE_KEY = 'aperfy-checkout-handoff';

interface PersistedCheckoutHandoff {
  orderId: string;
  channel: CheckoutPaymentChannel;
  url: string;
  createdAt: number;
}

function readPersistedCheckoutHandoff(): PersistedCheckoutHandoff | null {
  try {
    const raw = localStorage.getItem(CHECKOUT_HANDOFF_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<PersistedCheckoutHandoff>;
    if (!value.orderId || !value.url || (value.channel !== 'whatsapp' && value.channel !== 'telegram')) return null;
    if (typeof value.createdAt !== 'number' || Date.now() - value.createdAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(CHECKOUT_HANDOFF_STORAGE_KEY);
      return null;
    }
    return value as PersistedCheckoutHandoff;
  } catch {
    return null;
  }
}

// ─── Apple-style floating-label input ───
interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}
function Field({ label, value, onChange, error, ...rest }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const float = focused || !!value;
  return (
    <div className="relative">
      <div className={`relative rounded-xl bg-background border transition-all ${
        error ? 'border-destructive/60' : focused ? 'border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]' : 'border-border'
      }`}>
        <label className={`pointer-events-none absolute left-4 transition-all ${
          float ? 'top-1.5 text-[10px] uppercase tracking-wider text-muted-foreground' : 'top-1/2 -translate-y-1/2 text-sm text-muted-foreground'
        }`}>
          {label}
        </label>
        <input
          {...rest}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full bg-transparent px-4 pt-5 pb-2 text-[15px] text-foreground outline-none placeholder:text-muted-foreground/40"
        />
      </div>
      {error && <p className="text-xs text-destructive mt-1.5 ml-1">{error}</p>}
    </div>
  );
}

interface TAFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  label: string;
  value: string;
  onChange: (v: string) => void;
}
function TAField({ label, value, onChange, ...rest }: TAFieldProps) {
  const [focused, setFocused] = useState(false);
  const float = focused || !!value;
  return (
    <div className={`relative rounded-xl bg-background border transition-all ${
      focused ? 'border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]' : 'border-border'
    }`}>
      <label className={`pointer-events-none absolute left-4 transition-all ${
        float ? 'top-1.5 text-[10px] uppercase tracking-wider text-muted-foreground' : 'top-4 text-sm text-muted-foreground'
      }`}>
        {label}
      </label>
      <textarea
        {...rest}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full bg-transparent px-4 pt-6 pb-2 text-[15px] text-foreground outline-none resize-none placeholder:text-muted-foreground/40"
      />
    </div>
  );
}

function SelectField({
  label, value, onChange, options, placeholder, disabled, error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block px-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</label>
      <div className={`relative rounded-xl border bg-background transition-colors ${error ? 'border-destructive/60' : 'border-border focus-within:border-primary'}`}>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="min-h-12 w-full appearance-none bg-transparent px-4 pr-10 text-[15px] text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="" disabled>{placeholder}</option>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {error && <p className="ml-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function PhoneField({
  label, value, countryCode, countries, onChange, onCountryChange, error,
}: {
  label: string;
  value: string;
  countryCode: string;
  countries: Array<{ isoCode: string; name: string; phoneCode: string }>;
  onChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  error?: string;
}) {
  const selected = countries.find((country) => country.isoCode === countryCode);
  const callingCode = selected?.phoneCode || '';
  const localValue = value.replace(/\D/g, '').replace(new RegExp(`^${callingCode.replace('+', '')}`), '');
  return (
    <div>
      <div className={`flex overflow-hidden rounded-xl border bg-background transition-colors ${error ? 'border-destructive/60' : 'border-border focus-within:border-primary focus-within:shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]'}`}>
        <label className="sr-only" htmlFor="checkout-phone-country">{label} country</label>
        <select
          id="checkout-phone-country"
          aria-label={`${label} country`}
          value={countryCode}
          onChange={(event) => onCountryChange(event.target.value)}
          className="w-[108px] shrink-0 appearance-none border-r border-border bg-transparent px-3 text-sm text-foreground outline-none"
        >
          {countries.map((country) => <option key={country.isoCode} value={country.isoCode}>{country.isoCode} {country.phoneCode}</option>)}
        </select>
        <div className="relative min-w-0 flex-1">
          <label className="pointer-events-none absolute left-4 top-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>
          <input
            id="checkout-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={localValue}
            onChange={(event) => onChange(normalizePhoneForCountry(event.target.value, countryCode))}
            placeholder="555 555 0123"
            className="w-full bg-transparent px-4 pb-2 pt-5 text-[15px] text-foreground outline-none placeholder:text-muted-foreground/40"
          />
        </div>
      </div>
      <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">{callingCode ? `+${callingCode.replace('+', '')} · ` : ''}Formato internacional para WhatsApp</p>
      {error && <p className="ml-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function AddressAutocomplete({
  value, countryCode, onChange, onSelect, language,
}: {
  value: string;
  countryCode: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  language: 'es' | 'en';
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 3) { setSuggestions([]); setOpen(false); return undefined; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const result = await searchAddress(query, countryCode, controller.signal);
        setSuggestions(result);
        setOpen(result.length > 0);
      } catch { /* manual entry remains available when lookup is unavailable */ }
      finally { setSearching(false); }
    }, 650);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [value, countryCode]);

  return (
    <div className="relative">
      <div className="relative">
        <Field
          label={language === 'es' ? 'Dirección' : 'Address'}
          value={value}
          onChange={onChange}
          maxLength={255}
          autoComplete="street-address"
          role="combobox"
          aria-expanded={open}
          aria-controls="address-suggestions"
        />
        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </div>
      </div>
      {open && suggestions.length > 0 && (
        <div id="address-suggestions" role="listbox" className="absolute z-40 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-primary/20 bg-card shadow-2xl">
          {suggestions.map((suggestion, index) => (
            <button
              type="button"
              role="option"
              key={`${suggestion.label}-${index}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => { onSelect(suggestion); setOpen(false); }}
              className="flex w-full items-start gap-3 border-b border-white/[0.05] px-4 py-3 text-left last:border-0 hover:bg-primary/[0.08]"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="text-xs leading-5 text-foreground">{suggestion.label}</span>
            </button>
          ))}
          <p className="px-4 py-2 text-[10px] text-muted-foreground">{language === 'es' ? 'Sugerencias de OpenStreetMap · también puedes escribir manualmente' : 'OpenStreetMap suggestions · manual entry is always available'}</p>
        </div>
      )}
      {searching && !open && <div className="absolute z-40 mt-2 flex w-full items-center gap-2 rounded-xl border border-primary/20 bg-card px-4 py-3 text-xs text-muted-foreground shadow-2xl"><Loader2 className="h-4 w-4 animate-spin text-primary" />{language === 'es' ? 'Buscando direcciones…' : 'Searching addresses…'}</div>}
    </div>
  );
}

function CityAutocomplete({
  label, value, countryCode, onChange, language, error,
}: {
  label: string;
  value: string;
  countryCode: string;
  onChange: (value: string) => void;
  language: 'es' | 'en';
  error?: string;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (value.trim().length < 2) { setSuggestions([]); setOpen(false); return undefined; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const result = await searchAddress(value, countryCode, controller.signal, 'city');
        setSuggestions(result);
        setOpen(result.length > 0);
      } catch { /* manual city entry is still available */ }
    }, 500);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [value, countryCode]);

  return (
    <div className="relative">
      <Field label={label} value={value} onChange={onChange} error={error} maxLength={100} autoComplete="address-level2" />
      {open && suggestions.length > 0 && (
        <div role="listbox" className="absolute z-40 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-primary/20 bg-card shadow-2xl">
          {suggestions.map((suggestion, index) => (
            <button
              type="button"
              role="option"
              key={`${suggestion.label}-${index}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => { onChange(suggestion.city || suggestion.label.split(',')[0]); setOpen(false); }}
              className="flex w-full items-center gap-3 border-b border-white/[0.05] px-4 py-3 text-left last:border-0 hover:bg-primary/[0.08]"
            >
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-xs text-foreground">{suggestion.city || suggestion.label}</span>
            </button>
          ))}
          <p className="px-4 py-2 text-[10px] text-muted-foreground">{language === 'es' ? 'Ciudades sugeridas por OpenStreetMap' : 'Cities suggested by OpenStreetMap'}</p>
        </div>
      )}
    </div>
  );
}

// ─── APERFY conversational checkout stepper ───
function StepRail({ current, labels }: { current: number; labels: string[] }) {
  const total = labels.length;
  const pct = Math.round(((current + 0.0001) / total) * 100);
  const stepIcons = [Cog, CreditCard, Package, Truck];

  return (
    <div className="mb-12">
      {/* Layer / percentage header */}
      <div className="flex items-end justify-between mb-3 px-1">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Step {String(current + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </div>
          <div className="font-display text-sm font-semibold text-foreground mt-0.5 tracking-tight">
            {labels[current]}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Ready
          </div>
          <div className="font-display text-sm font-semibold tabular-nums text-gradient-gold mt-0.5">
            {pct}%
          </div>
        </div>
      </div>

      {/* Checkout progress bar */}
      <div className="relative h-[6px] w-full rounded-full bg-white/[0.05] overflow-hidden">
        <motion.div
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 22 }}
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/60 via-primary to-primary/80"
        />
        {/* nozzle head */}
        <motion.div
          initial={false}
          animate={{ left: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 22 }}
          className="absolute top-1/2 -translate-y-1/2 -ml-1.5 w-3 h-3 rounded-full bg-primary shadow-[0_0_14px_3px_hsl(var(--primary)/0.7)]"
        />
        {/* shimmer */}
        <motion.div
          aria-hidden
          className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          animate={{ x: ['-10%', '110%'] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: 'linear' }}
          style={{ mixBlendMode: 'overlay' }}
        />
      </div>

      {/* Step nodes */}
      <div className="grid grid-cols-3 gap-2 mt-5" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
        {labels.map((label, i) => {
          const Icon = stepIcons[i] ?? Zap;
          const done = i < current;
          const active = i === current;
          return (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <motion.div
                initial={false}
                animate={{
                  scale: active ? 1.06 : 1,
                  backgroundColor: done || active ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                  clipPath: done || active ? 'inset(0% 0 0 0)' : 'inset(0% 0 0 0)',
                }}
                transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                className={`relative w-9 h-9 rounded-xl flex items-center justify-center ${
                  done || active ? 'text-primary-foreground' : 'text-muted-foreground'
                }`}
                aria-label={`Paso ${i + 1} de ${total}: ${label}`}
              >
                {done ? <Check className="w-4 h-4" strokeWidth={3} /> : <Icon className="w-4 h-4" strokeWidth={2.2} />}
                {active && (
                  <motion.span
                    layoutId="step-rail-halo"
                    className="absolute inset-0 rounded-xl ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                    transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                  />
                )}
              </motion.div>
              <span className={`font-mono text-[9px] uppercase tracking-[0.18em] ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Apple/Palantir collapsible section ───
function SectionCard({
  index, title, subtitle, isActive, isComplete, summary, onEdit, children, ctaLabel, onContinue, disabled,
}: {
  index: number;
  title: string;
  subtitle?: string;
  isActive: boolean;
  isComplete: boolean;
  summary?: ReactNode;
  onEdit: () => void;
  children: ReactNode;
  ctaLabel: string;
  onContinue: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      className={`relative rounded-2xl border bg-card/40 backdrop-blur-xl transition-colors overflow-hidden ${
        isActive ? 'border-primary/30' : 'border-white/[0.06]'
      }`}
    >
      {isActive && (
        <motion.span
          layoutId="section-active-rail"
          className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary"
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        />
      )}
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono text-[11px] font-semibold tabular-nums shrink-0 ${
            isComplete ? 'bg-primary/15 text-primary border border-primary/30' :
            isActive ? 'bg-foreground text-background' :
            'bg-muted/40 text-muted-foreground border border-white/5'
          }`}>
            {isComplete ? <Check className="w-4 h-4" strokeWidth={3} /> : String(index).padStart(2, '0')}
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {String(index).padStart(2, '0')} /
              </span>
              <h2 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
            </div>
            {subtitle && !isActive && !isComplete && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            {isComplete && summary && <div className="text-xs text-muted-foreground/80 mt-1 truncate">{summary}</div>}
          </div>
        </div>
        {isComplete && (
          <button onClick={onEdit} className="text-xs font-mono uppercase tracking-wider text-primary hover:text-primary/80 transition-colors shrink-0">
            Edit
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-1 space-y-4 border-t border-white/[0.04]">
              <div className="pt-4 space-y-3">{children}</div>
              <Button
                onClick={onContinue}
                disabled={disabled}
                className="w-full h-12 rounded-full bg-foreground text-background hover:bg-foreground/90 font-semibold text-[14px] tracking-tight group"
              >
                <span>{ctaLabel}</span>
                <motion.span
                  className="ml-1 inline-block"
                  initial={false}
                  whileHover={{ x: 4 }}
                >→</motion.span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Checkout() {
  const { items, getTotal, clearCart, discount, getDiscountAmount, getFinalTotal } = useCart();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', address: '', address2: '', city: '', state: '', zipCode: '', country: '', notes: ''
  });
  const [phoneCountry, setPhoneCountry] = useState('US');
  const [addressCountryCode, setAddressCountryCode] = useState('US');
  const [addressStateCode, setAddressStateCode] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const persistedHandoff = useMemo(() => readPersistedCheckoutHandoff(), []);
  const [step, setStep] = useState<Step>(persistedHandoff ? 'channel-sent' : 'shipping');
  const [section, setSection] = useState<Section>('contact');
  const [completed, setCompleted] = useState<Record<Section, boolean>>({ contact: false, address: false, shipping: false });
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [selectedShipping, setSelectedShipping] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(persistedHandoff?.orderId || null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(persistedHandoff?.channel === 'whatsapp' ? persistedHandoff.url : null);
  const [telegramUrl, setTelegramUrl] = useState<string | null>(persistedHandoff?.channel === 'telegram' ? persistedHandoff.url : null);
  const [handoffChannel, setHandoffChannel] = useState<CheckoutPaymentChannel | null>(persistedHandoff?.channel || null);
  const [paymentConfigs, setPaymentConfigs] = useState<Record<string, PaymentConfig>>({});
  const [summaryOpen, setSummaryOpen] = useState(false);
  const whatsappIdempotencyKeyRef = useRef<string | null>(null);
  const telegramIdempotencyKeyRef = useRef<string | null>(null);

  const countryOptions = useMemo(() => getCountryOptions(language === 'es' ? 'es' : 'en'), [language]);
  const phoneCountryOptions = useMemo(() => getPhoneCountryOptions(language === 'es' ? 'es' : 'en'), [language]);
  const [stateOptions, setStateOptions] = useState<Array<{ isoCode: string; name: string }>>([]);

  const stepLabels = language === 'es' ? ['Envío', 'Pago', 'Confirmación'] : ['Shipping', 'Payment', 'Confirmation'];
  const currentStepNum = step === 'shipping' ? 0 : step === 'method' ? 1 : 2;

  const { data: shippingProviders = [] } = useQuery({
    queryKey: ['checkout-shipping-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipping_providers').select('*').eq('is_active', true).order('base_rate', { ascending: true });
      if (error) throw error;
      return data as ShippingProvider[];
    },
  });

  const { data: paymentSettings } = useQuery({
    queryKey: ['payment-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings').select('*').in('setting_key', [...PAYMENT_SETTING_KEYS]);
      if (error) throw error;
      return data;
    },
    enabled: step === 'method' || step === 'payment-instructions',
  });

  useEffect(() => {
    if (!paymentSettings) return;
    const map: Record<string, PaymentConfig> = {};
    for (const s of paymentSettings) {
      const channel = paymentChannelFromKey(s.setting_key);
      if (channel) {
        const parsed = parsePaymentChannelSetting(s.setting_key, s.setting_value);
        if (parsed.active) map[channel] = parsed;
        continue;
      }
      try {
        const parsed = JSON.parse(s.setting_value || '{}');
        if (parsed.active) map[s.setting_key.replace('payment_', '')] = parsed;
      } catch { /* skip */ }
    }
    setPaymentConfigs(map);
  }, [paymentSettings]);

  useEffect(() => {
    if (!user) return;
    setForm(prev => ({ ...prev, email: prev.email || user.email || '' }));
    supabase.from('profiles').select('full_name, phone').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) setForm(prev => ({
          ...prev,
          fullName: prev.fullName || data.full_name || '',
          phone: prev.phone || data.phone || '',
        }));
      });
  }, [user]);

  useEffect(() => {
    let active = true;
    setStateOptions([]);
    getStatesForCountry(addressCountryCode).then((states) => {
      if (active) setStateOptions(states);
    });
    return () => { active = false; };
  }, [addressCountryCode]);

  useEffect(() => {
    let active = true;
    const localeCountry = navigator.language?.split('-')[1]?.toUpperCase();
    const fallbackCountry = countryOptions.some((country) => country.isoCode === localeCountry) ? localeCountry : 'US';
    setPhoneCountry(fallbackCountry);
    setAddressCountryCode(fallbackCountry);
    setForm((prev) => ({ ...prev, country: prev.country || getCountryName(fallbackCountry, language === 'es' ? 'es' : 'en') }));
    detectCountryFromIp().then((detected) => {
      if (!active || !detected || !countryOptions.some((country) => country.isoCode === detected)) return;
      setPhoneCountry(detected);
      setAddressCountryCode(detected);
      setForm((prev) => ({ ...prev, country: prev.country || getCountryName(detected, language === 'es' ? 'es' : 'en') }));
    });
    return () => { active = false; };
  }, [countryOptions, language]);

  const selectedProvider = shippingProviders.find(p => p.id === selectedShipping);
  const totalWeight = useMemo(() =>
    items.reduce((sum, item) => sum + (item.quantity * (item.weightGrams && item.weightGrams > 0 ? item.weightGrams : 100)) / 1000, 0)
  , [items]);
  const shippingCost = selectedProvider ? Number(selectedProvider.base_rate) + (totalWeight * Number(selectedProvider.per_kg_rate)) : 0;
  const subtotal = getTotal();
  const discountAmount = getDiscountAmount();
  const orderTotal = Math.max(0, getFinalTotal() + shippingCost);
  const handoffComplete = step === 'channel-sent' && Boolean(createdOrderId && handoffChannel && (whatsappUrl || telegramUrl));

  useEffect(() => {
    if (items.length > 0 && step === 'channel-sent') {
      localStorage.removeItem(CHECKOUT_HANDOFF_STORAGE_KEY);
      setStep('shipping');
      setCreatedOrderId(null);
      setWhatsappUrl(null);
      setTelegramUrl(null);
      setHandoffChannel(null);
    }
  }, [items.length, step]);

  const setF = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }));

  const handleAddressCountryChange = (countryCode: string) => {
    setAddressCountryCode(countryCode);
    setAddressStateCode('');
    setForm((prev) => ({
      ...prev,
      country: getCountryName(countryCode, language === 'es' ? 'es' : 'en'),
      state: '',
      city: '',
    }));
  };

  const handleAddressStateChange = (stateCode: string) => {
    setAddressStateCode(stateCode);
    const state = stateOptions.find((option) => option.isoCode === stateCode);
    setF('state', state?.name || '');
    setF('city', '');
  };

  const handleAddressSuggestion = (suggestion: AddressSuggestion) => {
    const nextCountryCode = suggestion.countryCode || addressCountryCode;
    setForm((prev) => ({
      ...prev,
      address: suggestion.address || suggestion.label,
      city: suggestion.city || '',
      state: suggestion.state || '',
      zipCode: suggestion.zipCode || '',
      country: suggestion.country || getCountryName(nextCountryCode, language === 'es' ? 'es' : 'en'),
    }));
    setAddressStateCode('');
    if (suggestion.countryCode && countryOptions.some((country) => country.isoCode === suggestion.countryCode)) {
      setAddressCountryCode(suggestion.countryCode);
    }
    getStatesForCountry(nextCountryCode).then((states) => {
      const stateQuery = suggestion.state.trim().toLowerCase();
      const matchedState = stateQuery
        ? states.find((state) => state.name.toLowerCase() === stateQuery || state.isoCode.toLowerCase() === stateQuery)
        : undefined;
      if (matchedState) setAddressStateCode(matchedState.isoCode);
    });
  };

  const validateContact = () => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim() || form.fullName.length < 2) errs.fullName = language === 'es' ? 'Nombre requerido' : 'Name is required';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = language === 'es' ? 'Email inválido' : 'Invalid email';
    if (!isCheckoutPhoneValid(form.phone, phoneCountry)) errs.phone = language === 'es' ? 'Teléfono inválido para el país seleccionado' : 'Invalid phone for the selected country';
    setFieldErrors(prev => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  };

  const continueContact = () => {
    if (!validateContact()) return;
    setCompleted(c => ({ ...c, contact: true }));
    setSection('address');
  };

  const continueAddress = () => {
    setFieldErrors({});
    const result = checkoutSchema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach(i => { errs[i.path[0] as string] = i.message; });
      setFieldErrors(errs);
      return;
    }
    setCompleted(c => ({ ...c, address: true }));
    if (shippingProviders.length > 0) setSection('shipping');
    else { setCompleted(c => ({ ...c, address: true, shipping: true })); proceedToPayment(); }
  };

  const continueShipping = () => {
    if (shippingProviders.length > 0 && !selectedShipping) {
      toast({ title: language === 'es' ? 'Selecciona envío' : 'Select shipping', variant: 'destructive' });
      return;
    }
    setCompleted(c => ({ ...c, shipping: true }));
    proceedToPayment();
  };

  const proceedToPayment = () => {
    if (items.length > MAX_ORDER_ITEMS) {
      toast({ title: 'Error', description: `Maximum ${MAX_ORDER_ITEMS} items per order`, variant: 'destructive' });
      return;
    }
    if (items.some(i => i.quantity > MAX_ITEM_QUANTITY)) {
      toast({ title: 'Error', description: `Maximum ${MAX_ITEM_QUANTITY} per item`, variant: 'destructive' });
      return;
    }
    setStep('method');
  };

  const createOrder = async (paymentMethod: string): Promise<string | null> => {
    if (!user) {
      throw new Error(language === 'es' ? 'Debes iniciar sesión para completar el pedido.' : 'You must sign in to complete the order.');
    }
    if (items.length === 0) return null;
    const pmResult = paymentMethodSchema.safeParse(paymentMethod);
    if (!pmResult.success) {
      toast({ title: 'Error', description: 'Invalid payment method', variant: 'destructive' });
      return null;
    }
    const { allowed, retryAfterMs } = checkRateLimit('checkout', 3, 5 * 60 * 1000);
    if (!allowed) {
      toast({ title: t.checkout.error, description: `Try again in ${formatRetryTime(retryAfterMs)}`, variant: 'destructive' });
      return null;
    }
    const productIds = items.map(i => i.productId);
    const { data: currentProducts, error: priceError } = await supabase
      .from('products').select('id, base_price, is_active, inventory_enabled, stock_quantity').in('id', productIds);
    if (priceError) throw priceError;
    const productMap = new Map(currentProducts?.map(p => [p.id, p]) || []);
    for (const item of items) {
      const dbProduct = productMap.get(item.productId);
      if (!dbProduct) throw new Error('Product not found');
      if (!dbProduct.is_active) throw new Error('Product is no longer available');
      if (dbProduct.inventory_enabled && item.quantity > dbProduct.stock_quantity) {
        throw new Error(language === 'es'
          ? `Solo quedan ${dbProduct.stock_quantity} unidades de ${item.productName}.`
          : `Only ${dbProduct.stock_quantity} units of ${item.productName} remain.`);
      }
    }
    const formResult = checkoutSchema.safeParse(form);
    if (!formResult.success) {
      throw new Error(language === 'es' ? 'Revisa los datos de envío antes de continuar.' : 'Review your shipping details before continuing.');
    }
    const vf = formResult.data;
    const idempotencyKey = paymentMethod === 'whatsapp'
      ? (whatsappIdempotencyKeyRef.current ||= crypto.randomUUID())
      : paymentMethod === 'telegram'
        ? (telegramIdempotencyKeyRef.current ||= crypto.randomUUID())
        : crypto.randomUUID();
    const orderInput = buildOrderInsert({
      userId: user.id,
      total: orderTotal,
      paymentMethod,
      idempotencyKey,
      form: vf,
      selectedShipping,
      shippingCost,
      discountId: discount?.id || null,
      discountAmount,
      language: language === 'es' ? 'es' : 'en',
      countryCode: addressCountryCode,
      phoneCountryCode: phoneCountry,
      stateCode: addressStateCode,
    });
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderInput)
      .select().single();
    if (orderError?.code === '23505') {
      const { data: existingOrder } = await supabase.from('orders').select('id').eq('idempotency_key', idempotencyKey).maybeSingle();
      if (existingOrder?.id) return existingOrder.id;
    }
    if (orderError) {
      console.error('Checkout order insert failed:', orderError);
      throw orderError;
    }
    if (discount?.id) {
      // best-effort increment usage counter
      await supabase.rpc('increment_discount_usage', { _id: discount.id }).then(() => undefined, () => undefined);
    }
    const orderItems = items.map(item => ({
      order_id: order.id, product_id: item.productId, quantity: item.quantity,
      unit_price: item.unitPrice + item.selectedVariations.reduce((s, v) => s + v.priceModifier, 0),
      selected_variations: item.selectedVariations, notes: item.notes || null,
    }));
    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
    if (itemsError) throw itemsError;
    const { data: stockResult, error: stockError } = await supabase.rpc('reserve_order_stock', { p_order_id: order.id });
    if (stockError) {
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id).eq('status', 'pending');
      throw stockError;
    }
    const stockResponse = (stockResult && typeof stockResult === 'object' ? stockResult : {}) as { ok?: boolean; code?: string };
    if (!stockResponse.ok) {
      throw new Error(stockResponse.code === 'INSUFFICIENT_STOCK'
        ? (language === 'es' ? 'El producto se agotó mientras completabas el pedido.' : 'The product sold out while you were checking out.')
        : (language === 'es' ? 'No pudimos reservar el inventario.' : 'We could not reserve inventory.'));
    }
    return order.id;
  };

  const sendOrderEmail = async (orderId: string, paymentMethod: string) => {
    const itemsSummary = items.map(item => {
      const varInfo = item.selectedVariations.map(v => v.name).filter(Boolean).join(', ');
      return `${item.productName}${varInfo ? ` (${varInfo})` : ''} x${item.quantity}`;
    }).join(', ');
    const shippingAddr = `${form.fullName}, ${form.address}, ${form.city}, ${form.state} ${form.zipCode}, ${form.country}`;
    try {
      const { error } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'order-confirmation', recipientEmail: form.email,
          idempotencyKey: `order-confirm-${orderId}`,
          templateData: {
            customerName: form.fullName, orderId, total: orderTotal.toFixed(2),
            paymentMethod, itemsSummary, shippingAddress: shippingAddr,
            language: language === 'es' ? 'es' : 'en',
          },
        },
      });
      if (error) throw error;
    } catch (e) { console.error('Email send failed:', e); throw e; }
  };

  const notifyOrderChannel = async (orderId: string, channel: CheckoutPaymentChannel) => {
    try {
      const { data, error } = await supabase.functions.invoke('notify-telegram-order', { body: { orderId, channel } });
      if (error) throw error;
      if (data?.ok === false) {
        toast({
          title: language === 'es' ? 'Pedido guardado' : 'Order saved',
          description: language === 'es' ? 'La alerta administrativa no pudo enviarse, pero tu pedido quedó registrado.' : 'The admin alert could not be sent, but your order was recorded.',
        });
      }
      return {
        ok: data?.ok !== false,
        whatsappUrl: typeof data?.whatsappUrl === 'string' ? data.whatsappUrl : null,
        telegramUrl: typeof data?.telegramUrl === 'string' ? data.telegramUrl : null,
        handoffUrl: typeof data?.handoffUrl === 'string' ? data.handoffUrl : null,
      };
    } catch (error) {
      console.error('Telegram order notification failed:', error);
      toast({
        title: language === 'es' ? 'Pedido guardado' : 'Order saved',
        description: language === 'es' ? 'La alerta administrativa no está disponible, pero tu pedido quedó registrado.' : 'Admin alerts are unavailable, but your order was recorded.',
      });
      return { ok: false, whatsappUrl: null, telegramUrl: null, handoffUrl: null };
    }
  };

  const handleChannel = async (channel: CheckoutPaymentChannel) => {
    setLoading(true);
    setSelectedPayment(channel);
    try {
      const orderId = await createOrder(channel);
      if (!orderId) { setLoading(false); return; }
      setCreatedOrderId(orderId);
      try {
        await sendOrderEmail(orderId, channel === 'whatsapp' ? 'WhatsApp' : 'Telegram');
      } catch (error) {
        console.error('Order email notification failed:', error);
        toast({
          title: language === 'es' ? 'Pedido guardado' : 'Order saved',
          description: language === 'es' ? 'El correo no está disponible, pero continuaremos con el canal seleccionado.' : 'Email is unavailable, but we will continue through the selected channel.',
        });
      }
      const handoff = await notifyOrderChannel(orderId, channel);
      const redirectUrl = getCheckoutHandoffUrl(null, handoff.handoffUrl);
      if (!redirectUrl) throw new Error(language === 'es' ? `Configura el destino de ${channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'} en Admin → Integraciones.` : `Configure the ${channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'} destination in Admin → Integrations.`);
      setWhatsappUrl(handoff.whatsappUrl);
      setTelegramUrl(handoff.telegramUrl);
      setHandoffChannel(channel);
      clearCart();
      setStep('channel-sent');
      localStorage.setItem(CHECKOUT_HANDOFF_STORAGE_KEY, JSON.stringify({ orderId, channel, url: redirectUrl, createdAt: Date.now() } satisfies PersistedCheckoutHandoff));
      if (channel === 'whatsapp') void supabase.from('orders').update({ whatsapp_opened_at: new Date().toISOString() }).eq('id', orderId)
        .then(({ error }) => {
          if (error) console.warn('Checkout WhatsApp tracking failed:', error);
        });
      // Keep the APERFY confirmation page in this tab. Opening the external
      // handoff in a new tab prevents iOS/in-app browsers from returning to a
      // blank document after WhatsApp or Telegram closes.
      const handoffWindow = window.open(redirectUrl, '_blank', 'noopener,noreferrer');
      if (!handoffWindow) toast({ title: language === 'es' ? 'Pedido creado' : 'Order created', description: language === 'es' ? 'El navegador bloqueó la ventana externa. Usa el botón para abrir el canal.' : 'The browser blocked the external window. Use the button to open the channel.' });
    } catch (error: unknown) {
      toast({ title: t.checkout.error, description: getCheckoutErrorMessage(error, 'Checkout failed'), variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleWhatsApp = () => handleChannel('whatsapp');
  const handleTelegram = () => handleChannel('telegram');

  const handleOnlinePayment = async (method: string) => {
    setLoading(true);
    setSelectedPayment(method);
    try {
      const orderId = await createOrder(method);
      if (!orderId) { setLoading(false); return; }
      setCreatedOrderId(orderId);
      await sendOrderEmail(orderId, method);
      clearCart();
      setStep('payment-instructions');
    } catch (error: unknown) {
      toast({ title: t.checkout.error, description: getCheckoutErrorMessage(error, 'Checkout failed'), variant: 'destructive' });
    } finally { setLoading(false); }
  };

  if (items.length === 0 && step === 'shipping') {
    navigate('/cart');
    return null;
  }

  const paymentIcons: Record<string, string> = { zelle: '💵', binance: '🪙', cashapp: '💰' };

  // ─── Order summary panel (sticky right + mobile collapsible) ───
  const SummaryPanel = (
    <div className="rounded-2xl border border-white/[0.06] bg-card/40 backdrop-blur-xl p-6 space-y-5">
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.05]">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Summary</span>
        </div>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {String(items.length).padStart(2, '0')} {items.length === 1 ? 'ITEM' : 'ITEMS'}
        </span>
      </div>

      <div className="space-y-4 max-h-72 overflow-y-auto pr-1 -mr-1">
        {items.map(item => {
          const varMod = item.selectedVariations.reduce((s, v) => s + v.priceModifier, 0);
          const itemTotal = (item.unitPrice + varMod) * item.quantity;
          return (
            <div key={item.productId + JSON.stringify(item.selectedVariations)} className="flex gap-3 group">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.06] bg-white p-1">
                <CartThumbnailImage
                  source={item.productImage}
                  alt={item.productName}
                  width={168}
                  height={168}
                  quality={72}
                  className="h-full w-full object-contain"
                  fallback={<Package className="h-5 w-5 text-muted-foreground/40" />}
                />
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-mono font-bold tabular-nums flex items-center justify-center">
                  {item.quantity}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-[13px] font-medium text-foreground tracking-tight">{item.productName}</p>
                {item.selectedVariations.length > 0 && (
                  <p className="text-[10px] text-muted-foreground truncate font-mono uppercase tracking-wider mt-0.5">{item.selectedVariations.map(v => v.name).filter(Boolean).join(' · ')}</p>
                )}
              </div>
              <span className="text-[13px] font-medium shrink-0 tabular-nums">${itemTotal.toFixed(2)}</span>
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/[0.05] pt-4 space-y-2.5 text-[13px]">
        <div className="flex justify-between text-muted-foreground">
          <span className="font-mono uppercase tracking-wider text-[10px]">{language === 'es' ? 'Subtotal' : 'Subtotal'}</span>
          <span className="text-foreground tabular-nums">${subtotal.toFixed(2)}</span>
        </div>
        {discount && discountAmount > 0 && (
          <div className="flex justify-between">
            <span className="font-mono uppercase tracking-wider text-[10px] text-primary">{discount.code}</span>
            <span className="text-primary tabular-nums">−${discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-muted-foreground">
          <span className="font-mono uppercase tracking-wider text-[10px]">{language === 'es' ? 'Envío' : 'Shipping'}</span>
          <motion.span
            key={shippingCost}
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="text-foreground tabular-nums"
          >
            {selectedProvider ? `$${shippingCost.toFixed(2)}` : '—'}
          </motion.span>
        </div>
        <div className="border-t border-white/[0.05] pt-3 mt-2 flex justify-between items-baseline">
          <span className="font-mono uppercase tracking-[0.2em] text-[10px] text-muted-foreground">{language === 'es' ? 'Total' : 'Total'}</span>
          <motion.span
            key={orderTotal}
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="text-2xl font-semibold tracking-tight tabular-nums text-gradient-gold"
          >
            ${orderTotal.toFixed(2)}
          </motion.span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground pt-2 font-mono uppercase tracking-wider">
        <Lock className="w-3 h-3" />
        {language === 'es' ? 'Transacción segura' : 'Secure checkout'}
      </div>
    </div>
  );

  // ─── Unified stage model (Apple "one decision per screen") ───
  type Stage = 'contact' | 'address' | 'shipping-method' | 'payment';
  const allStages: Stage[] = shippingProviders.length > 0
    ? ['contact', 'address', 'shipping-method', 'payment']
    : ['contact', 'address', 'payment'];
  const activeStage: Stage = step === 'method' ? 'payment' : (section === 'shipping' ? 'shipping-method' : section);
  const isStageDone = (s: Stage): boolean => {
    if (s === 'contact') return completed.contact;
    if (s === 'address') return completed.address;
    if (s === 'shipping-method') return completed.shipping;
    if (s === 'payment') return false;
    return false;
  };
  const goToStage = (s: Stage) => {
    if (s === 'payment') {
      if (!completed.contact || !completed.address || (shippingProviders.length > 0 && !completed.shipping)) return;
      setStep('method');
      return;
    }
    setStep('shipping');
    setSection(s === 'shipping-method' ? 'shipping' : s);
  };
  const stageLabel = (s: Stage): string => {
    const en = { contact: 'Contact', address: 'Address', 'shipping-method': 'Shipping', payment: 'Payment' };
    const es = { contact: 'Contacto', address: 'Dirección', 'shipping-method': 'Envío', payment: 'Pago' };
    return (language === 'es' ? es : en)[s];
  };

  const isInFlow = (step === 'shipping' || step === 'method') && !handoffComplete;

  return (
    <div className="min-h-full min-w-0 bg-background">
      <Navbar />

      {/* ═══ Top Command Bar (sticky, only during flow) ═══ */}
      {isInFlow && (
        <div className="sticky top-16 z-30 border-b border-white/[0.05] bg-background/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between gap-4">
            <button onClick={() => navigate('/cart')} className="inline-flex min-h-11 min-w-11 items-center gap-1.5 rounded-md px-2 text-[12px] text-muted-foreground transition-colors hover:text-foreground touch-manipulation">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{language === 'es' ? 'Volver al carrito' : 'Back to cart'}</span>
            </button>
            <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
              <span className="hidden sm:inline">Checkout</span>
              <span className="hidden sm:inline text-border">·</span>
              <span className="text-foreground tabular-nums">
                {String(allStages.indexOf(activeStage) + 1).padStart(2, '0')} / {String(allStages.length).padStart(2, '0')}
              </span>
              <span className="text-border">·</span>
              <span className="text-primary">{stageLabel(activeStage).toUpperCase()}</span>
            </div>
            <span className="hidden md:inline font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 tabular-nums">
              {createdOrderId ? `ORD-${createdOrderId.slice(0, 6).toUpperCase()}` : 'DRAFT'}
            </span>
          </div>
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="min-w-0 pt-8 xl:pt-10 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <AnimatePresence mode="wait">

          {/* ════ MAIN FLOW: 3-col layout with left rail + stage + summary ════ */}
          {isInFlow && (
            <motion.div key="flow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* Mobile horizontal step indicator */}
              <div className="xl:hidden mb-6">
                <StepRail current={['contact', 'address', 'shipping-method', 'payment'].indexOf(activeStage)} labels={allStages.map(stageLabel)} />
              </div>

              {/* Mobile collapsible summary */}
              <div className="xl:hidden mb-6">
                <button
                  onClick={() => setSummaryOpen(o => !o)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-white/[0.06] bg-card/40 backdrop-blur-sm"
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{language === 'es' ? 'Resumen' : 'Order summary'}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-base font-semibold tabular-nums">${orderTotal.toFixed(2)}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${summaryOpen ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                <AnimatePresence>
                  {summaryOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-3"
                    >
                      {SummaryPanel}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="grid min-w-0 xl:grid-cols-[220px_minmax(0,1fr)_340px] gap-6 xl:gap-10">

                {/* ─── LEFT NAV RAIL (desktop) ─── */}
                <aside className="hidden xl:block">
                  <div className="sticky top-32 space-y-1">
                    <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 px-3 mb-3">Stages</div>
                    {allStages.map((s, i) => {
                      const isActive = s === activeStage;
                      const done = isStageDone(s);
                      const reachable = done || isActive || (i === 0) || allStages.slice(0, i).every(isStageDone);
                      return (
                        <button
                          key={s}
                          onClick={() => reachable && goToStage(s)}
                          disabled={!reachable}
                          className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                            isActive ? 'bg-white/[0.04]' : reachable ? 'hover:bg-white/[0.02]' : 'opacity-40 cursor-not-allowed'
                          }`}
                        >
                          {isActive && (
                            <motion.span
                              layoutId="checkout-rail-active"
                              className="absolute left-0 top-2 bottom-2 w-[2px] bg-primary rounded-full"
                              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                          )}
                          <div className={`w-7 h-7 rounded-md flex items-center justify-center font-mono text-[10px] font-semibold tabular-nums shrink-0 ${
                            done ? 'bg-primary/15 text-primary border border-primary/30' :
                            isActive ? 'bg-foreground text-background' :
                            'bg-white/[0.03] text-muted-foreground border border-white/[0.06]'
                          }`}>
                            {done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : String(i + 1).padStart(2, '0')}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={`text-[13px] font-medium tracking-tight ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {stageLabel(s)}
                            </div>
                            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
                              {done ? 'Complete' : isActive ? 'In progress' : 'Pending'}
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    {/* Status footer */}
                    <div className="mt-6 pt-6 border-t border-white/[0.05] space-y-2 px-3">
                      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        <span className="flex items-center gap-1.5"><Lock className="w-3 h-3" /> Secure</span>
                        <span>TLS 1.3</span>
                      </div>
                      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        <span>Items</span>
                        <span className="tabular-nums">{String(items.length).padStart(2, '0')}</span>
                      </div>
                      {selectedProvider && (
                        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          <span>ETA</span>
                          <span className="tabular-nums">{selectedProvider.estimated_days_min}–{selectedProvider.estimated_days_max}d</span>
                        </div>
                      )}
                    </div>
                  </div>
                </aside>

                {/* ─── CENTER STAGE (active section only) ─── */}
                <main className="min-w-0">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeStage}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {/* Stage header */}
                      <div className="mb-6">
                        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary/80 mb-2">
                          {String(allStages.indexOf(activeStage) + 1).padStart(2, '0')} / {String(allStages.length).padStart(2, '0')}
                        </div>
                        <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-foreground">
                          {stageLabel(activeStage)}
                        </h1>
                      </div>

                      {/* Stage content */}
                      {activeStage === 'contact' && (
                        <SectionCard
                          index={1}
                          title={language === 'es' ? 'Información de contacto' : 'Contact information'}
                          subtitle={language === 'es' ? 'Para confirmación y seguimiento' : 'For order updates'}
                          isActive
                          isComplete={false}
                          onEdit={() => {}}
                          summary={null}
                          ctaLabel={language === 'es' ? 'Continuar a dirección' : 'Continue to address'}
                          onContinue={continueContact}
                        >
                          <Field label={language === 'es' ? 'Nombre completo' : 'Full name'} value={form.fullName} onChange={v => setF('fullName', v)} error={fieldErrors.fullName} maxLength={100} autoComplete="name" />
                          <Field label="Email" type="email" value={form.email} onChange={v => setF('email', v)} error={fieldErrors.email} maxLength={255} autoComplete="email" />
                          <PhoneField
                            label={language === 'es' ? 'Teléfono' : 'Phone'}
                            value={form.phone}
                            countryCode={phoneCountry}
                            countries={phoneCountryOptions}
                            onChange={(value) => setF('phone', value)}
                            onCountryChange={(countryCode) => {
                              setPhoneCountry(countryCode);
                              setF('phone', normalizePhoneForCountry(form.phone, countryCode));
                            }}
                            error={fieldErrors.phone}
                          />
                        </SectionCard>
                      )}

                      {activeStage === 'address' && (
                        <SectionCard
                          index={2}
                          title={language === 'es' ? 'Dirección de envío' : 'Shipping address'}
                          subtitle={language === 'es' ? 'Dirección completa para la entrega' : 'Full delivery address'}
                          isActive
                          isComplete={false}
                          onEdit={() => {}}
                          summary={null}
                          ctaLabel={shippingProviders.length > 0 ? (language === 'es' ? 'Continuar a envío' : 'Continue to shipping') : (language === 'es' ? 'Continuar a pago' : 'Continue to payment')}
                          onContinue={continueAddress}
                        >
                          <AddressAutocomplete
                            value={form.address}
                            countryCode={addressCountryCode}
                            onChange={(value) => setF('address', value)}
                            onSelect={handleAddressSuggestion}
                            language={language === 'es' ? 'es' : 'en'}
                          />
                          {fieldErrors.address && <p className="-mt-2 ml-1 text-xs text-destructive">{fieldErrors.address}</p>}
                          <Field label={language === 'es' ? 'Apto, suite (opcional)' : 'Apt, suite (optional)'} value={form.address2} onChange={v => setF('address2', v)} maxLength={255} />
                          <div className="grid sm:grid-cols-2 gap-3">
                            <CityAutocomplete
                              label={language === 'es' ? 'Ciudad' : 'City'}
                              value={form.city}
                              countryCode={addressCountryCode}
                              onChange={(value) => setF('city', value)}
                              language={language === 'es' ? 'es' : 'en'}
                              error={fieldErrors.city}
                            />
                            {stateOptions.length > 0 ? (
                              <SelectField
                                label={language === 'es' ? 'Estado / provincia' : 'State / province'}
                                value={addressStateCode}
                                onChange={handleAddressStateChange}
                                options={stateOptions.map((state) => ({ value: state.isoCode, label: state.name }))}
                                placeholder={language === 'es' ? 'Selecciona un estado' : 'Select a state'}
                                error={fieldErrors.state}
                              />
                            ) : (
                              <Field label={language === 'es' ? 'Estado' : 'State'} value={form.state} onChange={v => setF('state', v)} error={fieldErrors.state} maxLength={100} autoComplete="address-level1" />
                            )}
                          </div>
                          <div className="grid sm:grid-cols-2 gap-3">
                            <Field label={language === 'es' ? 'Código Postal' : 'ZIP / Postal'} value={form.zipCode} onChange={v => setF('zipCode', v)} error={fieldErrors.zipCode} maxLength={20} autoComplete="postal-code" />
                            <SelectField
                              label={language === 'es' ? 'País' : 'Country'}
                              value={addressCountryCode}
                              onChange={handleAddressCountryChange}
                              options={countryOptions.map((country) => ({ value: country.isoCode, label: country.name }))}
                              placeholder={language === 'es' ? 'Selecciona un país' : 'Select a country'}
                              error={fieldErrors.country}
                            />
                          </div>
                          <TAField label={language === 'es' ? 'Notas (opcional)' : 'Notes (optional)'} value={form.notes} onChange={v => setF('notes', v)} rows={2} maxLength={500} />
                        </SectionCard>
                      )}

                      {activeStage === 'shipping-method' && (
                        <SectionCard
                          index={3}
                          title={language === 'es' ? 'Método de envío' : 'Shipping method'}
                          subtitle={language === 'es' ? 'Selecciona cómo recibir tu pedido' : 'Choose how to receive your order'}
                          isActive
                          isComplete={false}
                          onEdit={() => {}}
                          summary={null}
                          ctaLabel={language === 'es' ? 'Continuar a pago' : 'Continue to payment'}
                          onContinue={continueShipping}
                          disabled={!selectedShipping}
                        >
                          <div className="space-y-2.5">
                            {shippingProviders.map(sp => {
                              const cost = Number(sp.base_rate) + (totalWeight * Number(sp.per_kg_rate));
                              const isSelected = selectedShipping === sp.id;
                              return (
                                <motion.button
                                  key={sp.id}
                                  onClick={() => setSelectedShipping(sp.id)}
                                  whileTap={{ scale: 0.99 }}
                                  className={`relative w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-colors ${
                                    isSelected ? 'border-primary/60 bg-primary/[0.05]' : 'border-white/[0.06] hover:border-primary/30 bg-background/40'
                                  }`}
                                >
                                  {isSelected && (
                                    <motion.span
                                      layoutId="shipping-active-ring"
                                      className="absolute inset-0 rounded-xl ring-1 ring-primary pointer-events-none"
                                      transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                                    />
                                  )}
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-primary' : 'border-muted-foreground/30'}`}>
                                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-foreground text-[15px] tracking-tight">{sp.name}</div>
                                    <div className="font-mono text-[10px] text-muted-foreground flex items-center gap-1.5 mt-1 uppercase tracking-wider">
                                      <Clock className="w-3 h-3" />
                                      {sp.estimated_days_min}–{sp.estimated_days_max} {language === 'es' ? 'DÍAS' : 'DAYS'}
                                    </div>
                                  </div>
                                  <span className="font-mono font-semibold text-foreground shrink-0 tabular-nums">${cost.toFixed(2)}</span>
                                </motion.button>
                              );
                            })}
                          </div>
                        </SectionCard>
                      )}

                      {activeStage === 'payment' && (
                        <div className="rounded-2xl border border-white/[0.06] bg-card/40 backdrop-blur-xl p-6">
                          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                            {String(allStages.indexOf('payment') + 1).padStart(2, '0')} / Payment method
                          </div>
                          <h2 className="text-2xl font-semibold tracking-tight mb-1">{language === 'es' ? 'Método de pago' : 'Choose payment'}</h2>
                          <p className="text-sm text-muted-foreground mb-6">{language === 'es' ? 'Confirma tu pedido por WhatsApp; los pagos online se habilitarán más adelante.' : 'Confirm your order through WhatsApp; online payments will be enabled later.'}</p>

                          {(['whatsapp', 'telegram'] as const).map((channel) => {
                            const cfg = paymentConfigs[channel];
                            if (!cfg) return null;
                            const isWhatsApp = channel === 'whatsapp';
                            const Icon = isWhatsApp ? MessageCircle : Send;
                            const isLoadingThis = loading && selectedPayment === channel;
                            return (
                              <motion.button
                                key={channel}
                                onClick={isWhatsApp ? handleWhatsApp : handleTelegram}
                                disabled={loading}
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.99 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                                className={`relative mb-3 w-full overflow-hidden rounded-2xl border bg-background/40 p-5 text-left transition-colors group disabled:opacity-50 ${isWhatsApp ? 'border-white/[0.06] hover:border-green-500/40' : 'border-white/[0.06] hover:border-sky-400/40'}`}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${isWhatsApp ? 'border-green-500/20 bg-green-500/10 text-green-500' : 'border-sky-400/20 bg-sky-400/10 text-sky-300'}`}><Icon className="h-6 w-6" /></div>
                                  <div className="min-w-0 flex-1"><h3 className="font-semibold text-[15px] tracking-tight">{cfg.label}</h3><p className="mt-1 text-xs text-muted-foreground">{getPaymentChannelDescription(cfg, language === 'es' ? 'es' : 'en')}</p></div>
                                  {isLoadingThis ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <span className="text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-foreground">→</span>}
                                </div>
                              </motion.button>
                            );
                          })}

                          {ONLINE_PAYMENTS_ENABLED && <div className="grid gap-2.5">
                            {Object.entries(paymentConfigs).map(([key, cfg]) => {
                              const isLoadingThis = loading && selectedPayment === key;
                              return (
                                <motion.button
                                  key={key}
                                  onClick={() => handleOnlinePayment(key)}
                                  disabled={loading}
                                  whileHover={{ y: -2 }}
                                  whileTap={{ scale: 0.99 }}
                                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                                  className="relative flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] hover:border-primary/40 bg-background/40 transition-colors disabled:opacity-50 text-left group"
                                >
                                  <div className="w-11 h-11 rounded-xl bg-primary/5 border border-primary/15 flex items-center justify-center text-xl shrink-0">
                                    {paymentIcons[key] || '💳'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="font-medium text-[15px] tracking-tight block">{cfg.label}</span>
                                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Manual transfer</span>
                                  </div>
                                  {isLoadingThis
                                    ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                    : <span className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all">→</span>}
                                </motion.button>
                              );
                            })}
                            {Object.keys(paymentConfigs).length === 0 && (
                              <p className="text-sm text-muted-foreground text-center py-2">{t.checkout.noPaymentMethods}</p>
                            )}
                          </div>}

                          <button onClick={() => { setStep('shipping'); setSection(shippingProviders.length > 0 ? 'shipping' : 'address'); }} className="mt-6 text-sm font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                            ← {language === 'es' ? 'Volver' : 'Back'}
                          </button>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </main>

                {/* ─── RIGHT SUMMARY (sticky) ─── */}
                <aside className="hidden xl:block">
                  <div className="sticky top-32">{SummaryPanel}</div>
                </aside>
              </div>
            </motion.div>
          )}


          {/* ── STEP 3: PAYMENT INSTRUCTIONS ── */}
          {step === 'payment-instructions' && selectedPayment && (
            <motion.div key="instructions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto py-8">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="w-12 h-12 text-primary" strokeWidth={1.5} />
              </motion.div>

              <h2 className="text-4xl font-semibold tracking-tight text-center text-foreground">
                {language === 'es' ? '¡Pedido creado!' : 'Order placed'}
              </h2>
              <p className="text-sm text-muted-foreground text-center mt-3 mb-10">
                {language === 'es' ? 'Pedido' : 'Order'} <span className="font-mono font-semibold text-foreground">#{createdOrderId?.slice(0, 8).toUpperCase()}</span>
              </p>

              <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{paymentIcons[selectedPayment] || '💳'}</span>
                  <h3 className="font-semibold text-xl tracking-tight">{paymentConfigs[selectedPayment]?.label}</h3>
                </div>
                {paymentConfigs[selectedPayment]?.info && (
                  <div className="bg-background rounded-xl p-4 border border-border/60">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{t.checkout.paymentDetails}</p>
                    <p className="font-mono font-medium text-foreground select-all text-lg">{paymentConfigs[selectedPayment].info}</p>
                  </div>
                )}
                <div className="border-t border-border/60 pt-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{t.checkout.paymentInstructions}</p>
                  <p className="text-sm whitespace-pre-wrap text-foreground/90">{paymentConfigs[selectedPayment]?.instructions || t.checkout.defaultInstructions}</p>
                </div>
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-baseline justify-between">
                  <span className="text-sm font-medium">{language === 'es' ? 'Total' : 'Total'}</span>
                  <span className="text-2xl font-semibold text-primary tracking-tight">${orderTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <Button variant="outline" onClick={() => navigate('/')} className="h-12 rounded-full">
                  {language === 'es' ? 'Seguir comprando' : 'Continue shopping'}
                </Button>
                <Button onClick={() => navigate('/orders')} className="h-12 rounded-full bg-foreground text-background hover:bg-foreground/90 font-semibold">
                  {t.checkout.viewOrders}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 4: EXTERNAL CHANNEL SENT ── */}
          {handoffComplete && handoffChannel && (
            <motion.div key="whatsapp-done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto py-8 text-center">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6"
              >
                {handoffChannel === 'whatsapp' ? <MessageCircle className="w-12 h-12 text-green-500" strokeWidth={1.5} /> : <Send className="w-12 h-12 text-sky-300" strokeWidth={1.5} />}
              </motion.div>
              <h2 className="text-4xl font-semibold tracking-tight">{language === 'es' ? '¡Pedido enviado!' : 'Order sent!'}</h2>
              <p className="text-sm text-muted-foreground mt-3">
                {language === 'es' ? 'Pedido' : 'Order'} <span className="font-mono font-semibold text-foreground">#{createdOrderId?.slice(0, 8).toUpperCase()}</span>
              </p>
              <p className="text-sm text-muted-foreground mt-2 mb-8">{language === 'es' ? `Tu pedido quedó registrado y se preparó el mensaje de ${handoffChannel === 'whatsapp' ? 'WhatsApp' : 'Telegram'}. Puedes volver a tu cuenta o continuar comprando.` : `Your order was recorded and the ${handoffChannel === 'whatsapp' ? 'WhatsApp' : 'Telegram'} message is ready. You can return to your account or continue shopping.`}</p>
              <div className="grid gap-3 max-w-md mx-auto sm:grid-cols-2">
                <Button variant="outline" onClick={() => { const url = handoffChannel === 'whatsapp' ? whatsappUrl : telegramUrl; if (url) window.open(url, '_blank', 'noopener,noreferrer'); }} className="h-12 rounded-full gap-2">
                  <ExternalLink className="w-4 h-4" />
                  {handoffChannel === 'whatsapp' ? t.checkout.openWhatsApp : (language === 'es' ? 'Abrir Telegram' : 'Open Telegram')}
                </Button>
                <Button onClick={() => { localStorage.removeItem(CHECKOUT_HANDOFF_STORAGE_KEY); navigate('/orders'); }} className="h-12 rounded-full bg-foreground text-background hover:bg-foreground/90 font-semibold">
                  {language === 'es' ? 'Ver mi cuenta' : 'View my account'}
                </Button>
                <Button variant="ghost" onClick={() => { localStorage.removeItem(CHECKOUT_HANDOFF_STORAGE_KEY); navigate('/'); }} className="h-12 rounded-full sm:col-span-2">{language === 'es' ? 'Seguir comprando' : 'Continue shopping'}</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <Footer />
    </div>
  );
}
