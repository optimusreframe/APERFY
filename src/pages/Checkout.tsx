import { useState, useEffect } from 'react';
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
import { Loader2, MessageCircle, CreditCard, ArrowLeft, CheckCircle2, ExternalLink } from 'lucide-react';
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

export default function Checkout() {
  const { items, getTotal, clearCart } = useCart();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', address: '', city: '', notes: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<Step>('shipping');
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [paymentConfigs, setPaymentConfigs] = useState<Record<string, PaymentConfig>>({});

  // Load payment methods only after order is created (security: don't expose before checkout)
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
          const methodKey = s.setting_key.replace('payment_', '');
          map[methodKey] = parsed;
        }
      } catch { /* skip */ }
    }
    setPaymentConfigs(map);
  }, [paymentSettings]);

  // Pre-fill from profile
  useEffect(() => {
    if (!user) return;
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

    // Validate cart limits
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
    if (!user || items.length === 0) return null;

    // Validate payment method
    const pmResult = paymentMethodSchema.safeParse(paymentMethod);
    if (!pmResult.success) {
      toast({ title: 'Error', description: 'Invalid payment method', variant: 'destructive' });
      return null;
    }

    // Rate limit
    const { allowed, retryAfterMs } = checkRateLimit('checkout', 3, 5 * 60 * 1000);
    if (!allowed) {
      toast({ title: t.checkout.error, description: `Try again in ${formatRetryTime(retryAfterMs)}`, variant: 'destructive' });
      return null;
    }

    // Re-fetch prices to prevent tampering
    const productIds = items.map(i => i.productId);
    const { data: currentProducts, error: priceError } = await supabase
      .from('products')
      .select('id, base_price, is_active')
      .in('id', productIds);

    if (priceError) throw priceError;

    // Verify all products exist and are active
    const productMap = new Map(currentProducts?.map(p => [p.id, p]) || []);
    for (const item of items) {
      const dbProduct = productMap.get(item.productId);
      if (!dbProduct) throw new Error('Product not found');
      if (!dbProduct.is_active) throw new Error('Product is no longer available');
    }

    const priceMap = new Map(currentProducts?.map(p => [p.id, Number(p.base_price)]) || []);
    let priceChanged = false;
    for (const item of items) {
      const currentPrice = priceMap.get(item.productId);
      if (currentPrice !== undefined && currentPrice !== item.unitPrice) {
        // Check if it's a size variation where unitPrice is the calculated price
        const hasSizeVar = item.selectedVariations.some(v => v.type === 'size');
        if (!hasSizeVar && currentPrice !== item.unitPrice) {
          priceChanged = true;
          break;
        }
      }
    }

    if (priceChanged) {
      toast({ title: t.checkout.priceChanged || 'Prices updated', description: t.checkout.priceChangedDesc, variant: 'destructive' });
      return null;
    }

    const formResult = checkoutSchema.safeParse(form);
    if (!formResult.success) return null;
    const validatedForm = formResult.data;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        total: getTotal(),
        notes: validatedForm.notes || null,
        payment_method: paymentMethod,
        shipping_address: {
          full_name: validatedForm.fullName,
          phone: validatedForm.phone,
          address: validatedForm.address,
          city: validatedForm.city,
        },
      } as any)
      .select()
      .single();

    if (orderError) throw orderError;

    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice + item.selectedVariations.reduce((s, v) => s + (v.type === 'size' ? 0 : v.priceModifier), 0),
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

      const message = [
        `🛒 *Nueva Orden #${orderCode}*`,
        '',
        itemLines,
        '',
        `*Total: $${getTotal().toFixed(2)}*`,
        '',
        `📦 Envío:`,
        `${form.fullName}`,
        `${form.phone}`,
        `${form.address}, ${form.city}`,
        form.notes ? `\n📝 Notas: ${form.notes}` : '',
      ].filter(Boolean).join('\n');

      clearCart();
      setStep('whatsapp-sent');

      // Open WhatsApp in new tab
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
    } catch (err: any) {
      toast({ title: t.checkout.error, description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
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
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && step === 'shipping') {
    navigate('/cart');
    return null;
  }

  const paymentIcons: Record<string, string> = {
    zelle: '💵',
    binance: '🪙',
    cashapp: '💰',
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-24 pb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-display font-black text-3xl sm:text-4xl mb-8">{t.checkout.title}</h1>

        <AnimatePresence mode="wait">
          {/* ── STEP 1: SHIPPING ── */}
          {step === 'shipping' && (
            <motion.div key="shipping" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <div className="grid lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 space-y-4">
                  <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                    <h2 className="font-display font-bold text-lg">{t.checkout.shippingInfo}</h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label>{t.checkout.fullName} *</Label>
                        <Input value={form.fullName} onChange={e => handleChange('fullName', e.target.value)} className="mt-1 bg-background" maxLength={100} />
                        {fieldErrors.fullName && <p className="text-xs text-destructive mt-1">{fieldErrors.fullName}</p>}
                      </div>
                      <div>
                        <Label>{t.checkout.phone} *</Label>
                        <Input value={form.phone} onChange={e => handleChange('phone', e.target.value)} className="mt-1 bg-background" maxLength={20} />
                        {fieldErrors.phone && <p className="text-xs text-destructive mt-1">{fieldErrors.phone}</p>}
                      </div>
                    </div>
                    <div>
                      <Label>{t.checkout.address} *</Label>
                      <Input value={form.address} onChange={e => handleChange('address', e.target.value)} className="mt-1 bg-background" maxLength={255} />
                      {fieldErrors.address && <p className="text-xs text-destructive mt-1">{fieldErrors.address}</p>}
                    </div>
                    <div>
                      <Label>{t.checkout.city} *</Label>
                      <Input value={form.city} onChange={e => handleChange('city', e.target.value)} className="mt-1 bg-background" maxLength={100} />
                      {fieldErrors.city && <p className="text-xs text-destructive mt-1">{fieldErrors.city}</p>}
                    </div>
                    <div>
                      <Label>{t.checkout.orderNotes}</Label>
                      <Textarea value={form.notes} onChange={e => handleChange('notes', e.target.value)} className="mt-1 bg-background" rows={3} maxLength={500} />
                      {fieldErrors.notes && <p className="text-xs text-destructive mt-1">{fieldErrors.notes}</p>}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <div className="bg-card border border-border rounded-xl p-6 sticky top-24">
                    <h2 className="font-display font-bold text-lg mb-4">{t.checkout.orderSummary}</h2>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {items.map(item => (
                        <div key={item.productId + JSON.stringify(item.selectedVariations)} className="flex gap-3 text-sm">
                          <div className="w-10 h-10 rounded bg-secondary overflow-hidden shrink-0">
                            {item.productImage && <img src={item.productImage} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium text-foreground">{item.productName}</p>
                            <p className="text-muted-foreground">x{item.quantity}</p>
                          </div>
                          <span className="font-semibold shrink-0">
                            ${(item.unitPrice * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-border mt-4 pt-4 flex justify-between font-bold">
                      <span>{t.cart.total}</span>
                      <span className="text-gradient-gold">${getTotal().toFixed(2)}</span>
                    </div>
                    <Button
                      onClick={validateAndProceed}
                      className="w-full mt-6 bg-gradient-gold text-primary-foreground font-semibold h-12"
                    >
                      {t.checkout.continueToPayment}
                    </Button>
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

              <div className="max-w-xl mx-auto space-y-6">
                <div className="text-center mb-8">
                  <h2 className="font-display font-bold text-xl">{t.checkout.choosePayment}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{t.checkout.choosePaymentDesc}</p>
                </div>

                {/* WhatsApp Option */}
                <button
                  onClick={handleWhatsApp}
                  disabled={loading}
                  className="w-full p-6 rounded-xl border-2 border-border hover:border-primary/50 bg-card text-left transition-all hover:shadow-lg group disabled:opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display font-bold text-lg">{t.checkout.whatsappTitle}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{t.checkout.whatsappDesc}</p>
                    </div>
                    {loading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                  </div>
                </button>

                {/* Online Payment Option */}
                <div className="p-6 rounded-xl border-2 border-border bg-card space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <CreditCard className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg">{t.checkout.onlineTitle}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{t.checkout.onlineDesc}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 pt-2">
                    {Object.entries(paymentConfigs).map(([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => handleOnlinePayment(key)}
                        disabled={loading}
                        className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 bg-background transition-all hover:shadow-md disabled:opacity-50 text-left"
                      >
                        <span className="text-2xl">{paymentIcons[key] || '💳'}</span>
                        <span className="font-medium">{cfg.label}</span>
                        {loading && selectedPayment === key && <Loader2 className="w-4 h-4 animate-spin text-primary ml-auto" />}
                      </button>
                    ))}
                    {Object.keys(paymentConfigs).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">{t.checkout.noPaymentMethods}</p>
                    )}
                  </div>
                </div>

                {/* Order Summary Mini */}
                <div className="bg-secondary/50 rounded-xl p-4 border border-border">
                  <div className="flex justify-between font-bold">
                    <span>{t.cart.total}</span>
                    <span className="text-gradient-gold">${getTotal().toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: PAYMENT INSTRUCTIONS ── */}
          {step === 'payment-instructions' && selectedPayment && (
            <motion.div key="instructions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
                <h2 className="font-display font-bold text-xl">{t.checkout.orderCreated}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t.checkout.orderCode}: <span className="font-mono font-bold text-foreground">#{createdOrderId?.slice(0, 8).toUpperCase()}</span>
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{paymentIcons[selectedPayment] || '💳'}</span>
                  <h3 className="font-display font-bold text-lg">{paymentConfigs[selectedPayment]?.label}</h3>
                </div>

                {paymentConfigs[selectedPayment]?.info && (
                  <div className="bg-secondary rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-1">{t.checkout.paymentDetails}</p>
                    <p className="font-mono font-medium text-foreground select-all">{paymentConfigs[selectedPayment].info}</p>
                  </div>
                )}

                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground mb-2">{t.checkout.paymentInstructions}</p>
                  <p className="text-sm whitespace-pre-wrap">{paymentConfigs[selectedPayment]?.instructions || t.checkout.defaultInstructions}</p>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm">
                  <p className="font-semibold text-primary">{t.checkout.totalToPay}: ${getTotal().toFixed(2)}</p>
                </div>
              </div>

              <Button onClick={() => navigate('/orders')} className="w-full mt-6 bg-gradient-gold text-primary-foreground font-semibold h-12 gap-2">
                {t.checkout.viewOrders}
              </Button>
            </motion.div>
          )}

          {/* ── STEP 4: WHATSAPP SENT ── */}
          {step === 'whatsapp-sent' && (
            <motion.div key="whatsapp-done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto text-center">
              <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="font-display font-bold text-xl mb-2">{t.checkout.whatsappSent}</h2>
              <p className="text-sm text-muted-foreground mb-2">
                {t.checkout.orderCode}: <span className="font-mono font-bold text-foreground">#{createdOrderId?.slice(0, 8).toUpperCase()}</span>
              </p>
              <p className="text-sm text-muted-foreground mb-6">{t.checkout.whatsappSentDesc}</p>

              <div className="flex gap-3 justify-center">
                <Button onClick={() => navigate('/orders')} className="bg-gradient-gold text-primary-foreground gap-2">
                  {t.checkout.viewOrders}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank')}
                  className="gap-2"
                >
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
