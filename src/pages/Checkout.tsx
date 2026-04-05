import { useState, useEffect, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageCircle, CreditCard, ArrowLeft, CheckCircle2, ExternalLink, MapPin, User, Phone, Mail, Truck, Package, Shield, Clock, Weight, Ruler } from 'lucide-react';
import { checkoutSchema, paymentMethodSchema, MAX_ORDER_ITEMS, MAX_ITEM_QUANTITY } from '@/lib/validation';
import { checkRateLimit, formatRetryTime } from '@/lib/rate-limit';

const WHATSAPP_NUMBER = '16893324656';

type Step = 'shipping' | 'method' | 'payment-instructions' | 'whatsapp-sent';

interface PaymentConfig {
  active: boolean;
  label: string;
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

const STEP_LABELS_EN = ['Shipping', 'Payment', 'Confirmation'];
const STEP_LABELS_ES = ['Envío', 'Pago', 'Confirmación'];

function StepIndicator({ current, labels }: { current: number; labels: string[] }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-10">
      {labels.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            i < current ? 'bg-primary/20 text-primary' :
            i === current ? 'bg-gradient-gold text-primary-foreground shadow-lg' :
            'bg-muted text-muted-foreground'
          }`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              i < current ? 'bg-primary text-primary-foreground' :
              i === current ? 'bg-primary-foreground/20 text-primary-foreground' :
              'bg-muted-foreground/20 text-muted-foreground'
            }`}>
              {i < current ? '✓' : i + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </div>
          {i < labels.length - 1 && (
            <div className={`w-8 h-0.5 ${i < current ? 'bg-primary' : 'bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function Checkout() {
  const { items, getTotal, clearCart } = useCart();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', address: '', address2: '', city: '', state: '', zipCode: '', country: '', notes: ''
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<Step>('shipping');
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [selectedShipping, setSelectedShipping] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [paymentConfigs, setPaymentConfigs] = useState<Record<string, PaymentConfig>>({});

  const stepLabels = language === 'es' ? STEP_LABELS_ES : STEP_LABELS_EN;
  const currentStepNum = step === 'shipping' ? 0 : step === 'method' ? 1 : 2;

  // Load shipping providers
  const { data: shippingProviders = [] } = useQuery({
    queryKey: ['checkout-shipping-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipping_providers')
        .select('*')
        .eq('is_active', true)
        .order('base_rate', { ascending: true });
      if (error) throw error;
      return data as ShippingProvider[];
    },
  });

  // Load payment methods
  const { data: paymentSettings } = useQuery({
    queryKey: ['payment-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .in('setting_key', ['payment_zelle', 'payment_binance', 'payment_cashapp']);
      if (error) throw error;
      return data;
    },
    enabled: step === 'method' || step === 'payment-instructions',
  });

  useEffect(() => {
    if (!paymentSettings) return;
    const map: Record<string, PaymentConfig> = {};
    for (const s of paymentSettings) {
      try {
        const parsed = JSON.parse(s.setting_value || '{}');
        if (parsed.active) {
          map[s.setting_key.replace('payment_', '')] = parsed;
        }
      } catch { /* skip */ }
    }
    setPaymentConfigs(map);
  }, [paymentSettings]);

  // Pre-fill from profile
  useEffect(() => {
    if (!user) return;
    setForm(prev => ({ ...prev, email: prev.email || user.email || '' }));
    supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setForm(prev => ({
            ...prev,
            fullName: prev.fullName || data.full_name || '',
            phone: prev.phone || data.phone || '',
          }));
        }
      });
  }, [user]);

  // Calculate shipping cost
  const selectedProvider = shippingProviders.find(p => p.id === selectedShipping);
  const totalWeight = useMemo(() => {
    return items.reduce((sum, item) => {
      const w = item.weightGrams && item.weightGrams > 0 ? item.weightGrams : 100;
      return sum + (item.quantity * w) / 1000;
    }, 0);
  }, [items]);

  const shippingCost = selectedProvider
    ? Number(selectedProvider.base_rate) + (totalWeight * Number(selectedProvider.per_kg_rate))
    : 0;
  const subtotal = getTotal();
  const orderTotal = subtotal + shippingCost;

  const handleChange = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const validateAndProceed = () => {
    setFieldErrors({});
    const result = checkoutSchema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach(i => { errs[i.path[0] as string] = i.message; });
      setFieldErrors(errs);
      return;
    }
    if (items.length > MAX_ORDER_ITEMS) {
      toast({ title: 'Error', description: `Maximum ${MAX_ORDER_ITEMS} items per order`, variant: 'destructive' });
      return;
    }
    if (items.some(i => i.quantity > MAX_ITEM_QUANTITY)) {
      toast({ title: 'Error', description: `Maximum ${MAX_ITEM_QUANTITY} per item`, variant: 'destructive' });
      return;
    }
    if (shippingProviders.length > 0 && !selectedShipping) {
      toast({ title: language === 'es' ? 'Selecciona envío' : 'Select shipping', description: language === 'es' ? 'Elige un método de envío' : 'Please choose a shipping method', variant: 'destructive' });
      return;
    }
    setStep('method');
  };

  const createOrder = async (paymentMethod: string): Promise<string | null> => {
    if (!user || items.length === 0) return null;
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

    // Re-fetch prices
    const productIds = items.map(i => i.productId);
    const { data: currentProducts, error: priceError } = await supabase
      .from('products').select('id, base_price, is_active').in('id', productIds);
    if (priceError) throw priceError;

    const productMap = new Map(currentProducts?.map(p => [p.id, p]) || []);
    for (const item of items) {
      const dbProduct = productMap.get(item.productId);
      if (!dbProduct) throw new Error('Product not found');
      if (!dbProduct.is_active) throw new Error('Product is no longer available');
    }

    const formResult = checkoutSchema.safeParse(form);
    if (!formResult.success) return null;
    const vf = formResult.data;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        total: orderTotal,
        notes: vf.notes || null,
        payment_method: paymentMethod,
        shipping_address: {
          full_name: vf.fullName,
          email: vf.email,
          phone: vf.phone,
          address: vf.address,
          address2: vf.address2 || '',
          city: vf.city,
          state: vf.state,
          zip_code: vf.zipCode,
          country: vf.country,
        },
        shipping_provider_id: selectedShipping || null,
        shipping_cost: shippingCost,
      } as any)
      .select()
      .single();
    if (orderError) throw orderError;

    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice + item.selectedVariations.reduce((s, v) => s + v.priceModifier, 0),
      selected_variations: item.selectedVariations,
      notes: item.notes || null,
    }));
    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
    if (itemsError) throw itemsError;
    return order.id;
  };

  const handleWhatsApp = async () => {
    setLoading(true);
    try {
      const orderId = await createOrder('whatsapp');
      if (!orderId) { setLoading(false); return; }
      setCreatedOrderId(orderId);
      const orderCode = orderId.slice(0, 8).toUpperCase();
      const origin = window.location.origin;
      const itemLines = items.map(item => {
        const varInfo = item.selectedVariations.map(v => v.name).filter(Boolean).join(', ');
        const price = (item.unitPrice * item.quantity).toFixed(2);
        return `• ${item.productName}${varInfo ? ` (${varInfo})` : ''} x${item.quantity} — $${price}\n  ${origin}/3dmodels/${item.slug}`;
      }).join('\n');
      const shippingLine = selectedProvider ? `\n📦 Envío: ${selectedProvider.name} — $${shippingCost.toFixed(2)}` : '';
      const message = [
        `🛒 *Nueva Orden #${orderCode}*`, '', itemLines, shippingLine,
        '', `*Total: $${orderTotal.toFixed(2)}*`, '',
        `📍 Dirección:`, `${form.fullName}`, `${form.phone} | ${form.email}`,
        `${form.address}${form.address2 ? ', ' + form.address2 : ''}`,
        `${form.city}, ${form.state} ${form.zipCode}`, form.country,
        form.notes ? `\n📝 Notas: ${form.notes}` : '',
      ].filter(Boolean).join('\n');
      clearCart();
      setStep('whatsapp-sent');
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
    } catch (err: any) {
      toast({ title: t.checkout.error, description: err.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleOnlinePayment = async (method: string) => {
    setLoading(true);
    try {
      const orderId = await createOrder(method);
      if (!orderId) { setLoading(false); return; }
      setCreatedOrderId(orderId);
      setSelectedPayment(method);
      clearCart();
      setStep('payment-instructions');
    } catch (err: any) {
      toast({ title: t.checkout.error, description: err.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  if (items.length === 0 && step === 'shipping') {
    navigate('/cart');
    return null;
  }

  const paymentIcons: Record<string, string> = { zelle: '💵', binance: '🪙', cashapp: '💰' };

  const FieldError = ({ field }: { field: string }) => fieldErrors[field] ? <p className="text-xs text-destructive mt-1">{fieldErrors[field]}</p> : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-24 pb-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        <StepIndicator current={currentStepNum} labels={stepLabels} />

        <AnimatePresence mode="wait">
          {/* ── STEP 1: SHIPPING ── */}
          {step === 'shipping' && (
            <motion.div key="shipping" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <div className="grid lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 space-y-6">
                  {/* Contact Info */}
                  <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-display font-bold text-lg">{language === 'es' ? 'Información de Contacto' : 'Contact Information'}</h2>
                        <p className="text-xs text-muted-foreground">{language === 'es' ? 'Para confirmación y seguimiento del pedido' : 'For order confirmation and tracking'}</p>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-muted-foreground" />{t.checkout.fullName} *</Label>
                        <Input value={form.fullName} onChange={e => handleChange('fullName', e.target.value)} className="mt-1.5 bg-background" maxLength={100} placeholder="John Doe" />
                        <FieldError field="fullName" />
                      </div>
                      <div>
                        <Label className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-muted-foreground" />{language === 'es' ? 'Email' : 'Email'} *</Label>
                        <Input type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} className="mt-1.5 bg-background" maxLength={255} placeholder="you@email.com" />
                        <FieldError field="email" />
                      </div>
                    </div>
                    <div>
                      <Label className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-muted-foreground" />{t.checkout.phone} *</Label>
                      <Input value={form.phone} onChange={e => handleChange('phone', e.target.value)} className="mt-1.5 bg-background" maxLength={20} placeholder="+1 (555) 123-4567" />
                      <FieldError field="phone" />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-display font-bold text-lg">{t.checkout.shippingInfo}</h2>
                        <p className="text-xs text-muted-foreground">{language === 'es' ? 'Dirección completa para la entrega' : 'Full delivery address'}</p>
                      </div>
                    </div>
                    <div>
                      <Label>{t.checkout.address} *</Label>
                      <Input value={form.address} onChange={e => handleChange('address', e.target.value)} className="mt-1.5 bg-background" maxLength={255} placeholder={language === 'es' ? 'Calle, número, casa/apto' : 'Street address, house/apt number'} />
                      <FieldError field="address" />
                    </div>
                    <div>
                      <Label>{language === 'es' ? 'Dirección Línea 2' : 'Address Line 2'}</Label>
                      <Input value={form.address2} onChange={e => handleChange('address2', e.target.value)} className="mt-1.5 bg-background" maxLength={255} placeholder={language === 'es' ? 'Suite, edificio, piso (opcional)' : 'Suite, building, floor (optional)'} />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label>{t.checkout.city} *</Label>
                        <Input value={form.city} onChange={e => handleChange('city', e.target.value)} className="mt-1.5 bg-background" maxLength={100} />
                        <FieldError field="city" />
                      </div>
                      <div>
                        <Label>{language === 'es' ? 'Estado / Provincia' : 'State / Province'} *</Label>
                        <Input value={form.state} onChange={e => handleChange('state', e.target.value)} className="mt-1.5 bg-background" maxLength={100} />
                        <FieldError field="state" />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label>{language === 'es' ? 'Código Postal' : 'ZIP / Postal Code'} *</Label>
                        <Input value={form.zipCode} onChange={e => handleChange('zipCode', e.target.value)} className="mt-1.5 bg-background" maxLength={20} />
                        <FieldError field="zipCode" />
                      </div>
                      <div>
                        <Label>{language === 'es' ? 'País' : 'Country'} *</Label>
                        <Input value={form.country} onChange={e => handleChange('country', e.target.value)} className="mt-1.5 bg-background" maxLength={100} />
                        <FieldError field="country" />
                      </div>
                    </div>
                    <div>
                      <Label>{t.checkout.orderNotes}</Label>
                      <Textarea value={form.notes} onChange={e => handleChange('notes', e.target.value)} className="mt-1.5 bg-background" rows={2} maxLength={500} placeholder={language === 'es' ? 'Instrucciones especiales de entrega...' : 'Special delivery instructions...'} />
                    </div>
                  </div>

                  {/* Shipping Method */}
                  {shippingProviders.length > 0 && (
                    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Truck className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h2 className="font-display font-bold text-lg">{language === 'es' ? 'Método de Envío' : 'Shipping Method'}</h2>
                          <p className="text-xs text-muted-foreground">{language === 'es' ? 'Selecciona cómo quieres recibir tu pedido' : 'Choose how you want to receive your order'}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {shippingProviders.map(sp => {
                          const cost = Number(sp.base_rate) + (totalWeight * Number(sp.per_kg_rate));
                          const isSelected = selectedShipping === sp.id;
                          return (
                            <button
                              key={sp.id}
                              onClick={() => setSelectedShipping(sp.id)}
                              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                                isSelected
                                  ? 'border-primary bg-primary/5 shadow-lg'
                                  : 'border-border hover:border-primary/30 bg-background'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                isSelected ? 'border-primary' : 'border-muted-foreground/30'
                              }`}>
                                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-foreground">{sp.name}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                  <Clock className="w-3 h-3" />
                                  {sp.estimated_days_min}-{sp.estimated_days_max} {language === 'es' ? 'días' : 'days'}
                                  {(language === 'es' ? sp.description_es : sp.description_en) && (
                                    <span>· {language === 'es' ? sp.description_es : sp.description_en}</span>
                                  )}
                                </div>
                              </div>
                              <span className="font-bold text-primary shrink-0">${cost.toFixed(2)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-2">
                  <div className="bg-card border border-border rounded-2xl p-6 sticky top-24 space-y-5">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-primary" />
                      <h2 className="font-display font-bold text-lg">{t.checkout.orderSummary}</h2>
                    </div>

                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {items.map(item => {
                        const varMod = item.selectedVariations.reduce((s, v) => s + v.priceModifier, 0);
                        const itemTotal = (item.unitPrice + varMod) * item.quantity;
                        return (
                          <div key={item.productId + JSON.stringify(item.selectedVariations)} className="flex gap-3">
                            <div className="w-14 h-14 rounded-xl bg-secondary overflow-hidden shrink-0 border border-border/50">
                              {item.productImage && <img src={item.productImage} alt="" className="w-full h-full object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-medium text-foreground text-sm">{item.productName}</p>
                              {item.selectedVariations.length > 0 && (
                                <p className="text-[11px] text-muted-foreground">{item.selectedVariations.map(v => v.name).filter(Boolean).join(', ')}</p>
                              )}
                              <div className="flex flex-wrap gap-x-2 gap-y-0 mt-0.5">
                                {item.weightGrams && item.weightGrams > 0 && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Weight className="w-2.5 h-2.5" />{item.weightGrams}g</span>
                                )}
                                {item.dimensions && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Ruler className="w-2.5 h-2.5" />{item.dimensions}mm</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">${item.unitPrice.toFixed(2)} × {item.quantity}</p>
                            </div>
                            <span className="font-semibold text-sm shrink-0">${itemTotal.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="border-t border-border pt-4 space-y-2 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>{t.cart.subtotal}</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      {selectedProvider && (
                        <div className="flex justify-between text-muted-foreground">
                          <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> {selectedProvider.name}</span>
                          <span>${shippingCost.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t border-border pt-3 flex justify-between font-bold text-base">
                        <span>{t.cart.total}</span>
                        <span className="text-gradient-gold text-lg">${orderTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <Button
                      onClick={validateAndProceed}
                      className="w-full bg-gradient-gold text-primary-foreground font-semibold h-12 text-base"
                    >
                      {t.checkout.continueToPayment}
                    </Button>

                    <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                      <Shield className="w-3.5 h-3.5" />
                      {language === 'es' ? 'Transacción segura y encriptada' : 'Secure & encrypted transaction'}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: PAYMENT METHOD ── */}
          {step === 'method' && (
            <motion.div key="method" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Button variant="ghost" onClick={() => setStep('shipping')} className="mb-6 gap-2 text-muted-foreground">
                <ArrowLeft className="w-4 h-4" /> {t.checkout.backToShipping}
              </Button>

              <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center mb-8">
                  <h2 className="font-display font-bold text-2xl">{t.checkout.choosePayment}</h2>
                  <p className="text-sm text-muted-foreground mt-2">{t.checkout.choosePaymentDesc}</p>
                </div>

                {/* WhatsApp Option */}
                <button
                  onClick={handleWhatsApp}
                  disabled={loading}
                  className="w-full p-6 rounded-2xl border-2 border-border hover:border-green-500/50 bg-card text-left transition-all hover:shadow-xl group disabled:opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center shrink-0 group-hover:bg-green-500/20 transition-colors">
                      <MessageCircle className="w-7 h-7 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display font-bold text-lg">{t.checkout.whatsappTitle}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{t.checkout.whatsappDesc}</p>
                    </div>
                    {loading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                  </div>
                </button>

                {/* Online Payments */}
                <div className="p-6 rounded-2xl border-2 border-border bg-card space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                      <CreditCard className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg">{t.checkout.onlineTitle}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{t.checkout.onlineDesc}</p>
                    </div>
                  </div>
                  <div className="grid gap-3">
                    {Object.entries(paymentConfigs).map(([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => handleOnlinePayment(key)}
                        disabled={loading}
                        className="flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/50 bg-background transition-all hover:shadow-lg disabled:opacity-50 text-left"
                      >
                        <span className="text-3xl">{paymentIcons[key] || '💳'}</span>
                        <span className="font-medium text-base">{cfg.label}</span>
                        {loading && selectedPayment === key && <Loader2 className="w-4 h-4 animate-spin text-primary ml-auto" />}
                      </button>
                    ))}
                    {Object.keys(paymentConfigs).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">{t.checkout.noPaymentMethods}</p>
                    )}
                  </div>
                </div>

                {/* Summary mini */}
                <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-5 border border-border">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t.cart.subtotal}</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    {selectedProvider && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>{language === 'es' ? 'Envío' : 'Shipping'}</span>
                        <span>${shippingCost.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-border pt-2 flex justify-between font-bold text-base">
                      <span>{t.cart.total}</span>
                      <span className="text-gradient-gold">${orderTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: PAYMENT INSTRUCTIONS ── */}
          {step === 'payment-instructions' && selectedPayment && (
            <motion.div key="instructions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto">
              <div className="text-center mb-8">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="w-10 h-10 text-primary" />
                </div>
                <h2 className="font-display font-bold text-2xl">{t.checkout.orderCreated}</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  {t.checkout.orderCode}: <span className="font-mono font-bold text-foreground text-base">#{createdOrderId?.slice(0, 8).toUpperCase()}</span>
                </p>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{paymentIcons[selectedPayment] || '💳'}</span>
                  <h3 className="font-display font-bold text-xl">{paymentConfigs[selectedPayment]?.label}</h3>
                </div>
                {paymentConfigs[selectedPayment]?.info && (
                  <div className="bg-secondary rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">{t.checkout.paymentDetails}</p>
                    <p className="font-mono font-medium text-foreground select-all text-lg">{paymentConfigs[selectedPayment].info}</p>
                  </div>
                )}
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground mb-2">{t.checkout.paymentInstructions}</p>
                  <p className="text-sm whitespace-pre-wrap">{paymentConfigs[selectedPayment]?.instructions || t.checkout.defaultInstructions}</p>
                </div>
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <p className="font-bold text-primary text-lg">{t.checkout.totalToPay}: ${orderTotal.toFixed(2)}</p>
                </div>
              </div>
              <Button onClick={() => navigate('/orders')} className="w-full mt-6 bg-gradient-gold text-primary-foreground font-semibold h-12 gap-2 text-base">
                {t.checkout.viewOrders}
              </Button>
            </motion.div>
          )}

          {/* ── STEP 4: WHATSAPP SENT ── */}
          {step === 'whatsapp-sent' && (
            <motion.div key="whatsapp-done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto text-center">
              <div className="w-20 h-20 rounded-3xl bg-green-500/10 flex items-center justify-center mx-auto mb-5">
                <MessageCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="font-display font-bold text-2xl mb-3">{t.checkout.whatsappSent}</h2>
              <p className="text-sm text-muted-foreground mb-1">
                {t.checkout.orderCode}: <span className="font-mono font-bold text-foreground">#{createdOrderId?.slice(0, 8).toUpperCase()}</span>
              </p>
              <p className="text-sm text-muted-foreground mb-8">{t.checkout.whatsappSentDesc}</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => navigate('/orders')} className="bg-gradient-gold text-primary-foreground gap-2 h-12 px-6">
                  {t.checkout.viewOrders}
                </Button>
                <Button variant="outline" onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank')} className="gap-2 h-12 px-6">
                  <ExternalLink className="w-4 h-4" />
                  {t.checkout.openWhatsApp}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <Footer />
    </div>
  );
}
