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

export default function Checkout() {
  const { items, getTotal, clearCart } = useCart();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', address: '', city: '', notes: '' });

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
    if (!user || items.length === 0) return;

    if (!form.fullName || !form.phone || !form.address || !form.city) {
      toast({ title: t.checkout.fillRequired, variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total: getTotal(),
          notes: form.notes || null,
          shipping_address: {
            full_name: form.fullName,
            phone: form.phone,
            address: form.address,
            city: form.city,
          },
        })
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

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h2 className="font-display font-bold text-lg">{t.checkout.shippingInfo}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>{t.checkout.fullName} *</Label>
                  <Input value={form.fullName} onChange={e => handleChange('fullName', e.target.value)} className="mt-1 bg-background" />
                </div>
                <div>
                  <Label>{t.checkout.phone} *</Label>
                  <Input value={form.phone} onChange={e => handleChange('phone', e.target.value)} className="mt-1 bg-background" />
                </div>
              </div>
              <div>
                <Label>{t.checkout.address} *</Label>
                <Input value={form.address} onChange={e => handleChange('address', e.target.value)} className="mt-1 bg-background" />
              </div>
              <div>
                <Label>{t.checkout.city} *</Label>
                <Input value={form.city} onChange={e => handleChange('city', e.target.value)} className="mt-1 bg-background" />
              </div>
              <div>
                <Label>{t.checkout.orderNotes}</Label>
                <Textarea value={form.notes} onChange={e => handleChange('notes', e.target.value)} className="mt-1 bg-background" rows={3} />
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
