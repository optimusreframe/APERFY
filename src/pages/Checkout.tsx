import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
import { Loader2 } from 'lucide-react';
import { checkoutSchema } from '@/lib/validation';
import { checkRateLimit, formatRetryTime } from '@/lib/rate-limit';

export default function Checkout() {
  const { items, getTotal, clearCart } = useCart();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', address: '', city: '', notes: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    if (!user || items.length === 0) return;

    // Rate limit
    const { allowed, retryAfterMs } = checkRateLimit('checkout', 3, 5 * 60 * 1000);
    if (!allowed) {
      toast({ title: t.checkout.error, description: `Try again in ${formatRetryTime(retryAfterMs)}`, variant: 'destructive' });
      return;
    }

    // Validate form
    const result = checkoutSchema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach(i => { errs[i.path[0] as string] = i.message; });
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    try {
      // Re-fetch current prices to prevent localStorage tampering
      const productIds = items.map(i => i.productId);
      const { data: currentProducts, error: priceError } = await supabase
        .from('products')
        .select('id, base_price')
        .in('id', productIds);

      if (priceError) throw priceError;

      const priceMap = new Map(currentProducts?.map(p => [p.id, Number(p.base_price)]) || []);
      let priceChanged = false;

      for (const item of items) {
        const currentPrice = priceMap.get(item.productId);
        if (currentPrice !== undefined && currentPrice !== item.unitPrice) {
          priceChanged = true;
          break;
        }
      }

      if (priceChanged) {
        toast({
          title: t.checkout.priceChanged || 'Prices updated',
          description: t.checkout.priceChangedDesc || 'Some product prices have changed. Please review your cart.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const validatedForm = result.data;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total: getTotal(),
          notes: validatedForm.notes || null,
          shipping_address: {
            full_name: validatedForm.fullName,
            phone: validatedForm.phone,
            address: validatedForm.address,
            city: validatedForm.city,
          },
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: (priceMap.get(item.productId) ?? item.unitPrice) + item.selectedVariations.reduce((s, v) => s + v.priceModifier, 0),
        selected_variations: item.selectedVariations,
        notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      clearCart();
      toast({ title: t.checkout.success });
      navigate('/orders');
    } catch (err: any) {
      toast({ title: t.checkout.error, description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-24 pb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-display font-black text-3xl sm:text-4xl mb-8">{t.checkout.title}</h1>

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-5 gap-8" noValidate>
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
                  <div key={item.productId} className="flex gap-3 text-sm">
                    <div className="w-10 h-10 rounded bg-secondary overflow-hidden shrink-0">
                      {item.productImage && <img src={item.productImage} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-foreground">{item.productName}</p>
                      <p className="text-muted-foreground">x{item.quantity}</p>
                    </div>
                    <span className="font-semibold shrink-0">
                      ${((item.unitPrice + item.selectedVariations.reduce((s, v) => s + v.priceModifier, 0)) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border mt-4 pt-4 flex justify-between font-bold">
                <span>{t.cart.total}</span>
                <span className="text-gradient-gold">${getTotal().toFixed(2)}</span>
              </div>
              <Button type="submit" disabled={loading} className="w-full mt-6 bg-gradient-gold text-primary-foreground font-semibold h-12 gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {t.checkout.placeOrder}
              </Button>
            </div>
          </div>
        </form>
      </motion.div>
      <Footer />
    </div>
  );
}
