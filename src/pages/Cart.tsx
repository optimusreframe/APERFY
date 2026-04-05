import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Trash2, Minus, Plus, ArrowLeft } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function Cart() {
  const { items, removeFromCart, updateQuantity, getTotal, clearCart } = useCart();
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-24 pb-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-display font-black text-3xl sm:text-4xl mb-8">{t.cart.title}</h1>

        {items.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground mb-4">{t.cart.empty}</p>
            <Link to="/">
              <Button variant="outline" className="gap-2"><ArrowLeft className="w-4 h-4" />{t.cart.continueShopping}</Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item, i) => (
                <motion.div
                  key={item.productId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex gap-4 bg-card border border-border rounded-xl p-4"
                >
                  <Link to={`/3dmodels/${item.slug}`} className="shrink-0">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-secondary">
                      {item.productImage ? (
                        <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingCart className="w-6 h-6 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/3dmodels/${item.slug}`}>
                      <h3 className="font-display font-semibold text-foreground truncate hover:text-primary transition-colors">{item.productName}</h3>
                    </Link>
                    {item.selectedVariations.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.selectedVariations.map(v => v.name).join(', ')}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="font-medium text-sm w-6 text-center">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gradient-gold">
                          ${((item.unitPrice + item.selectedVariations.reduce((s, v) => s + v.priceModifier, 0)) * item.quantity).toFixed(2)}
                        </span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeFromCart(item.productId)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="text-muted-foreground hover:text-destructive text-sm">
                    {t.cart.clearAll}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {language === 'es' ? '¿Vaciar carrito?' : 'Clear cart?'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {language === 'es'
                        ? 'Esto eliminará todos los productos de tu carrito. Esta acción no se puede deshacer.'
                        : 'This will remove all items from your cart. This action cannot be undone.'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{language === 'es' ? 'Cancelar' : 'Cancel'}</AlertDialogCancel>
                    <AlertDialogAction onClick={clearCart} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {t.cart.clearAll}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-xl p-6 sticky top-24">
                <h2 className="font-display font-bold text-lg mb-4">{t.cart.summary}</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t.cart.subtotal}</span>
                    <span>${getTotal().toFixed(2)}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between font-bold text-foreground">
                    <span>{t.cart.total}</span>
                    <span className="text-gradient-gold">${getTotal().toFixed(2)}</span>
                  </div>
                </div>
                <Button onClick={handleCheckout} className="w-full mt-6 bg-gradient-gold text-primary-foreground font-semibold h-12">
                  {t.cart.checkout}
                </Button>
                <Link to="/3dmodels" className="block mt-3">
                  <Button variant="ghost" className="w-full text-muted-foreground gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    {t.cart.continueShopping}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </motion.div>
      <Footer />
    </div>
  );
}
