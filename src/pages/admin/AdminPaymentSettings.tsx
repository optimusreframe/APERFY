import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard, ExternalLink, MessageCircle, Save, Send, RefreshCw, ShieldCheck } from 'lucide-react';
import { AdminPageHeader } from './_shared';
import { CHECKOUT_PAYMENT_KEYS, getDefaultPaymentChannel, parsePaymentChannelSetting, paymentChannelFromKey } from '@/lib/payment-channels';
import { DEFAULT_VENEZUELA_MARKUP_PERCENT, normalizeVenezuelaMarkup } from '@/lib/venezuela-pricing';

const PAYMENT_KEYS = [...CHECKOUT_PAYMENT_KEYS, 'payment_zelle', 'payment_binance', 'payment_cashapp'] as const;
type RateSource = 'bcv' | 'laslucas' | 'binance' | 'manual';

const RATE_SOURCES: Array<{ value: RateSource; title: string; description: string }> = [
  { value: 'bcv', title: 'BCV oficial', description: 'Referencia publicada por el Banco Central de Venezuela.' },
  { value: 'laslucas', title: 'Las Lucas · BCV', description: 'Referencia BCV distribuida por Las Lucas.' },
  { value: 'binance', title: 'Binance P2P', description: 'Mediana de anuncios USDT/VES para el mercado P2P.' },
  { value: 'manual', title: 'Manual', description: 'Valor definido por el administrador.' },
];

interface PaymentConfig {
  active: boolean;
  label: string;
  description_en?: string;
  description_es?: string;
  info: string;
  instructions: string;
}

const stripHtml = (str: string) => str.replace(/<[^>]*>/g, '').trim();

export default function AdminPaymentSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [configs, setConfigs] = useState<Record<string, PaymentConfig>>({});
  const [pricingMode, setPricingMode] = useState<'global' | 'geo'>('geo');
  const [rateSource, setRateSource] = useState<RateSource>('bcv');
  const [exchangeRate, setExchangeRate] = useState('');
  const [rateMeta, setRateMeta] = useState<{ source?: string; fetched_at?: string | null }>({});
  const [venezuelaMarkupPercent, setVenezuelaMarkupPercent] = useState(String(DEFAULT_VENEZUELA_MARKUP_PERCENT));

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-payment-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .in('setting_key', [...PAYMENT_KEYS, 'regional_pricing_mode', 'regional_pricing_rate_source', 'venezuela_global_markup_percent']);
      if (error) throw error;
      return data;
    },
  });

  const { data: savedRates } = useQuery({
    queryKey: ['admin-currency-rates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('currency_rates').select('*').eq('base_currency', 'USD').eq('quote_currency', 'VES').order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!settings) return;
    const map: Record<string, PaymentConfig> = {};
    for (const key of CHECKOUT_PAYMENT_KEYS) {
      const channel = paymentChannelFromKey(key);
      if (channel) map[key] = getDefaultPaymentChannel(channel);
    }
    for (const s of settings) {
      if (s.setting_key === 'regional_pricing_mode') {
        setPricingMode(s.setting_value === 'global' ? 'global' : 'geo');
        continue;
      }
      if (s.setting_key === 'regional_pricing_rate_source') {
        setRateSource(s.setting_value === 'laslucas' || s.setting_value === 'binance' || s.setting_value === 'manual' ? s.setting_value : 'bcv');
        continue;
      }
      if (s.setting_key === 'venezuela_global_markup_percent') {
        setVenezuelaMarkupPercent(String(normalizeVenezuelaMarkup(s.setting_value)));
        continue;
      }
      map[s.setting_key] = paymentChannelFromKey(s.setting_key)
        ? parsePaymentChannelSetting(s.setting_key, s.setting_value)
        : (() => {
          try { return { active: false, label: '', info: '', instructions: '', ...JSON.parse(s.setting_value || '{}') }; }
          catch { return { active: false, label: '', info: '', instructions: '' }; }
        })();
    }
    setConfigs(map);
  }, [settings]);

  useEffect(() => {
    const savedRate = savedRates?.find((rate) => rate.source === rateSource);
    if (!savedRate) {
      setExchangeRate('');
      setRateMeta({ source: rateSource });
      return;
    }
    setExchangeRate(String(savedRate.rate));
    setRateMeta({ source: savedRate.source, fetched_at: savedRate.fetched_at });
  }, [savedRates, rateSource]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const key of PAYMENT_KEYS) {
        const cfg = configs[key];
        if (!cfg) continue;
        // Sanitize
        const sanitized: PaymentConfig = {
          active: cfg.active,
          label: stripHtml(cfg.label).slice(0, 100),
          description_en: stripHtml(cfg.description_en || '').slice(0, 180),
          description_es: stripHtml(cfg.description_es || '').slice(0, 180),
          info: stripHtml(cfg.info).slice(0, 500),
          instructions: stripHtml(cfg.instructions).slice(0, 1000),
        };
        const { error } = await supabase
          .from('admin_settings')
          .upsert({ setting_key: key, setting_value: JSON.stringify(sanitized) }, { onConflict: 'setting_key' });
        if (error) throw error;
      }
      const { error: modeError } = await supabase.from('admin_settings').upsert({
        setting_key: 'regional_pricing_mode', setting_value: pricingMode,
      }, { onConflict: 'setting_key' });
      if (modeError) throw modeError;
      const { error: sourceError } = await supabase.from('admin_settings').upsert({
        setting_key: 'regional_pricing_rate_source', setting_value: rateSource,
      }, { onConflict: 'setting_key' });
      if (sourceError) throw sourceError;
      const markup = normalizeVenezuelaMarkup(venezuelaMarkupPercent);
      const { error: markupError } = await supabase.from('admin_settings').upsert({
        setting_key: 'venezuela_global_markup_percent', setting_value: String(markup),
      }, { onConflict: 'setting_key' });
      if (markupError) throw markupError;
      const numericRate = Number(exchangeRate);
      if (rateSource === 'manual' && Number.isFinite(numericRate) && numericRate > 0) {
        const { error: rateError } = await supabase.from('currency_rates').upsert({
          base_currency: 'USD', quote_currency: 'VES', rate: numericRate,
          source: 'manual', is_automatic: false, is_active: true,
          fetched_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'base_currency,quote_currency,source' });
        if (rateError) throw rateError;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-payment-settings'] });
      qc.invalidateQueries({ queryKey: ['admin-venezuela-pricing'] });
      toast({ title: '✓', description: 'Métodos de pago actualizados.' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to save payment settings', variant: 'destructive' });
    },
  });

  const refreshRateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('storefront-pricing', { body: { action: 'refresh-rate', source: rateSource } });
      if (error) throw error;
      if (!data?.rate) throw new Error('No se pudo obtener la tasa de la fuente seleccionada.');
      return data as { rate: number; source: RateSource; fetchedAt?: string | null };
    },
    onSuccess: (result) => {
      setExchangeRate(String(result.rate));
      setRateMeta({ source: result.source, fetched_at: result.fetchedAt ?? new Date().toISOString() });
      qc.invalidateQueries({ queryKey: ['admin-currency-rates'] });
      toast({ title: 'Tasa actualizada', description: `${result.rate} VES por USD.` });
    },
    onError: (error: unknown) => toast({ title: 'Error', description: error instanceof Error ? error.message : 'No se pudo actualizar la tasa.', variant: 'destructive' }),
  });

  const updateConfig = (key: string, field: keyof PaymentConfig, value: PaymentConfig[keyof PaymentConfig]) => {
    setConfigs(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const labels: Record<string, { icon: string; title: string }> = {
    payment_zelle: { icon: '💵', title: 'Zelle' },
    payment_binance: { icon: '🪙', title: 'Binance Pay (USDT)' },
    payment_cashapp: { icon: '💰', title: 'CashApp' },
  };

  const channelMeta: Record<string, { title: string; description: string; icon: typeof MessageCircle }> = {
    payment_whatsapp: { title: 'WhatsApp', description: 'El cliente recibirá un enlace con la comanda completa para enviarla por WhatsApp.', icon: MessageCircle },
    payment_telegram: { title: 'Telegram', description: 'El cliente recibirá un enlace para enviar la misma comanda por Telegram.', icon: Send },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <AdminPageHeader
        eyebrow="operations · payments"
        title="Métodos de Pago"
        meta="Configura los datos de pago que verán los clientes al realizar un pedido."
        actions={
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground gap-2"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar
        </Button>
        }
      />

      <Tabs defaultValue="payments" className="space-y-5">
        <TabsList className="grid h-auto w-full max-w-xl grid-cols-2 rounded-xl border border-border bg-card p-1">
          <TabsTrigger value="payments" className="rounded-lg py-2.5">Métodos de pago</TabsTrigger>
          <TabsTrigger value="pricing" className="rounded-lg py-2.5">Tasas y precios</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-0 space-y-6">
        <div className="rounded-2xl border border-primary/20 bg-primary/[0.05] p-5 text-sm text-muted-foreground">
        <div className="flex items-start gap-3">
          <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-semibold text-foreground">Destinos de mensajería</p>
            <p className="mt-1">El número de WhatsApp y el destino de Telegram se configuran de forma segura en Integraciones.</p>
            <a href="/admin/integrations" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full text-sm font-semibold text-primary hover:text-primary/80">
              Configurar WhatsApp y Telegram <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
        </div>

        <div className="grid gap-6">
        {PAYMENT_KEYS.map((key) => {
          const cfg = configs[key];
          if (!cfg) return null;
          const channel = paymentChannelFromKey(key);
          if (channel) {
            const meta = channelMeta[key];
            const Icon = meta.icon;
            return (
              <div key={key} className="rounded-2xl border border-border bg-card p-6 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
                    <div><h2 className="font-display text-lg font-bold">{meta.title}</h2><p className="mt-1 text-sm text-muted-foreground">{meta.description}</p></div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2"><Label className="text-xs text-muted-foreground">Activo</Label><Switch checked={cfg.active} onCheckedChange={(active) => updateConfig(key, 'active', active)} /></div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div><Label className="text-xs">Descripción en español</Label><Input value={cfg.description_es || ''} onChange={(event) => updateConfig(key, 'description_es', event.target.value)} className="mt-1 bg-background" maxLength={180} /></div>
                  <div><Label className="text-xs">Description in English</Label><Input value={cfg.description_en || ''} onChange={(event) => updateConfig(key, 'description_en', event.target.value)} className="mt-1 bg-background" maxLength={180} /></div>
                </div>
              </div>
            );
          }
          const meta = labels[key];
          return (
            <div key={key} className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-lg flex items-center gap-2">
                  <span className="text-xl">{meta.icon}</span>
                  {meta.title}
                </h2>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Activo</Label>
                  <Switch
                    checked={cfg.active}
                    onCheckedChange={(c) => updateConfig(key, 'active', c)}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Datos de pago (email, wallet, $tag, etc.)</Label>
                  <Input
                    value={cfg.info}
                    onChange={(e) => updateConfig(key, 'info', e.target.value)}
                    className="mt-1 bg-background"
                    placeholder="ej. email@zelle.com o $cashtag"
                    maxLength={500}
                  />
                </div>
                <div>
                  <Label className="text-xs">Instrucciones para el cliente</Label>
                  <Textarea
                    value={cfg.instructions}
                    onChange={(e) => updateConfig(key, 'instructions', e.target.value)}
                    className="mt-1 bg-background"
                    placeholder="Instrucciones paso a paso para que el cliente realice el pago..."
                    rows={3}
                    maxLength={1000}
                  />
                </div>
              </div>
            </div>
          );
        })}
        </div>
        </TabsContent>

        <TabsContent value="pricing" className="mt-0 space-y-5">
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.05] p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h2 className="font-semibold text-foreground">Regla de precios por ubicación</h2>
                <p className="mt-1 max-w-3xl text-sm text-muted-foreground">La decisión se aplica en servidor. En modo GEO un visitante venezolano nunca recibe la lista USA; en modo GLOBAL Venezuela recibe el precio USA en USD y su equivalente en VES.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {([
              ['global', 'Precio global', 'USA muestra USA USD. Venezuela muestra USA USD y puede cambiar a VES.'],
              ['geo', 'Bloqueo GEO', 'USA solo muestra USA. Venezuela solo muestra Venezuela USD o VES.'],
            ] as const).map(([value, title, description]) => (
              <button key={value} type="button" onClick={() => setPricingMode(value)} className={`rounded-2xl border p-5 text-left transition-colors ${pricingMode === value ? 'border-primary bg-primary/[0.08]' : 'border-border bg-card hover:border-primary/40'}`}>
                <div className="flex items-center justify-between gap-3"><span className="font-semibold">{title}</span><span className={`h-4 w-4 rounded-full border-2 ${pricingMode === value ? 'border-primary bg-primary ring-2 ring-primary/20' : 'border-muted-foreground/40'}`} /></div>
                <p className="mt-2 text-sm text-muted-foreground">{description}</p>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-bold">Fuente de tasa USD → VES</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Elige qué referencia se usará para calcular VES en Venezuela. Las tasas se guardan por separado y cambiar de fuente no borra las anteriores.</p>
              </div>
              <Button type="button" variant="outline" onClick={() => refreshRateMutation.mutate()} disabled={refreshRateMutation.isPending || rateSource === 'manual'} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${refreshRateMutation.isPending ? 'animate-spin' : ''}`} />
                {rateSource === 'manual' ? 'Tasa manual' : `Actualizar ${RATE_SOURCES.find((source) => source.value === rateSource)?.title}`}
              </Button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {RATE_SOURCES.map((source) => (
                <button
                  key={source.value}
                  type="button"
                  onClick={() => setRateSource(source.value)}
                  className={`rounded-xl border p-4 text-left transition-colors ${rateSource === source.value ? 'border-primary bg-primary/[0.08]' : 'border-border bg-background hover:border-primary/40'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{source.title}</span>
                    <span className={`h-3 w-3 rounded-full border-2 ${rateSource === source.value ? 'border-primary bg-primary ring-2 ring-primary/20' : 'border-muted-foreground/40'}`} />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{source.description}</p>
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,260px)_1fr] md:items-end">
              <div>
                <Label>VES por 1 USD</Label>
                <Input
                  type="number"
                  min="0.000001"
                  step="0.000001"
                  value={exchangeRate}
                  readOnly={rateSource !== 'manual'}
                  onChange={(event) => setExchangeRate(event.target.value)}
                  className="mt-1 bg-background"
                  placeholder="Ej. 876.7976"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Fuente activa: <span className="font-semibold text-foreground">{RATE_SOURCES.find((source) => source.value === rateSource)?.title}</span>
                {rateMeta.fetched_at ? ` · ${new Date(rateMeta.fetched_at).toLocaleString()}` : ''}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-bold">Regla global para Venezuela</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Los productos en modo Global se estandarizan automáticamente como Precio USA + este porcentaje. Los productos en modo Manual no cambian al editar este valor.</p>
              </div>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Precio USA + %</span>
            </div>
            <div className="mt-5 max-w-xs">
              <Label htmlFor="venezuela-global-markup">Porcentaje global de aumento</Label>
              <div className="relative mt-1">
                <Input
                  id="venezuela-global-markup"
                  type="number"
                  min="0"
                  max="1000"
                  step="0.1"
                  value={venezuelaMarkupPercent}
                  onChange={(event) => setVenezuelaMarkupPercent(event.target.value)}
                  className="bg-background pr-10"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">%</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Ejemplo: 40% convierte un producto de $20 USA en $28 USD Venezuela.</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
