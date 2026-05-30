import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Trash2, Minus, Plus, ArrowLeft, Weight, Ruler, Lock, ArrowRight } from 'lucide-react';
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

import DiscountCodeInput from '@/components/DiscountCodeInput';

export default function Cart() {
  const { items, removeFromCart, updateQuantity, getTotal, clearCart, itemCount, discount, getDiscountAmount, getFinalTotal } = useCart();
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

  const subtotal = getTotal();
  const discountAmount = getDiscountAmount();
  const finalTotal = getFinalTotal();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ═══ Top Command Bar ═══ */}
      <div className="sticky top-16 z-30 border-b border-white/[0.05] bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 text-[12px] text-muted-foreground">
            <Link to="/" className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors shrink-0">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.store.title}</span>
            </Link>
            <span className="text-border">/</span>
            <span className="text-foreground truncate">{t.cart.title}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
            <span className="tabular-nums">{String(itemCount).padStart(2, '0')} {language === 'es' ? 'items' : 'items'}</span>
            <div className="h-4 w-px bg-white/[0.06] hidden md:block" />
            <span className="hidden md:inline">CART-{Date.now().toString(36).slice(-6).toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div className="pt-10 pb-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title block */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary/80 mb-2">
            {language === 'es' ? 'Pedido' : 'Order'}
          </div>
          <h1 className="font-display font-bold text-4xl lg:text-5xl tracking-[-0.02em] text-foreground">
            {t.cart.title}
          </h1>
        </motion.div>

        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.06] bg-card/30 backdrop-blur-xl p-16 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
              <ShoppingCart className="w-7 h-7 text-muted-foreground/60" />
            </div>
            <p className="font-display text-xl font-semibold text-foreground mb-1.5">{t.cart.empty}</p>
            <p className="text-muted-foreground text-sm mb-6">
              {language === 'es' ? 'Explora el catálogo y comienza tu pedido.' : 'Browse the catalog to start your order.'}
            </p>
            <Link to="/">
              <Button className="bg-gradient-gold text-primary-foreground font-bold gap-2 h-11 px-6 rounded-full">
                {t.cart.continueShopping}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_380px] gap-6 lg:gap-8">
            {/* ─── Items list ─── */}
            <div className="space-y-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/80 px-1">
                {language === 'es' ? 'Productos' : 'Items'} · <span className="tabular-nums">{String(items.length).padStart(2, '0')}</span>
              </div>

              {items.map((item, i) => {
                const lineTotal = (item.unitPrice + item.selectedVariations.reduce((s, v) => s + v.priceModifier, 0)) * item.quantity;
                return (
                  <motion.div
                    key={item.productId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="group relative rounded-2xl border border-white/[0.06] bg-card/40 backdrop-blur-xl p-4 hover:border-white/[0.1] transition-colors"
                  >
                    <div className="flex gap-4">
                      <Link to={`/3dmodels/${item.slug}`} className="shrink-0">
                        <div className="w-24 h-24 rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.06]">
                          {item.productImage ? (
                            <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingCart className="w-6 h-6 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                      </Link>

                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link to={`/3dmodels/${item.slug}`}>
                              <h3 className="font-display font-semibold text-[15px] text-foreground truncate hover:text-primary transition-colors leading-tight">
                                {item.productName}
                              </h3>
                            </Link>
                            {item.selectedVariations.length > 0 && (
                              <p className="font-mono text-[10px] text-muted-foreground mt-1 uppercase tracking-wider truncate">
                                {item.selectedVariations.map(v => v.name).join(' · ')}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => removeFromCart(item.productId)}
                            className="shrink-0 p-1.5 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/[0.08] transition-colors"
                            aria-label="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Specs micro-row */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80">
                          {item.weightGrams && item.weightGrams > 0 && (
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <Weight className="w-3 h-3" />{item.weightGrams}g
                            </span>
                          )}
                          {item.dimensions && (
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <Ruler className="w-3 h-3" />{item.dimensions}mm
                            </span>
                          )}
                          <span className="tabular-nums">${item.unitPrice.toFixed(2)} {language === 'es' ? '/u' : '/ea'}</span>
                        </div>

                        {/* Qty + total */}
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="inline-flex items-center gap-0.5 rounded-full bg-white/[0.03] border border-white/[0.06] p-1">
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              className="w-7 h-7 rounded-full hover:bg-white/[0.06] flex items-center justify-center transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <AnimatePresence mode="wait">
                              <motion.span
                                key={item.quantity}
                                initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 3 }}
                                transition={{ duration: 0.15 }}
                                className="font-mono font-semibold text-[13px] w-8 text-center tabular-nums"
                              >
                                {String(item.quantity).padStart(2, '0')}
                              </motion.span>
                            </AnimatePresence>
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              className="w-7 h-7 rounded-full hover:bg-white/[0.06] flex items-center justify-center transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <AnimatePresence mode="wait">
                            <motion.span
                              key={lineTotal.toFixed(2)}
                              initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 3 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                              className="font-mono font-semibold text-[15px] tabular-nums text-foreground"
                            >
                              ${lineTotal.toFixed(2)}
                            </motion.span>
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Clear all */}
              <div className="pt-2 px-1">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-destructive transition-colors inline-flex items-center gap-1.5">
                      <Trash2 className="w-3 h-3" />
                      {t.cart.clearAll}
                    </button>
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
            </div>

            {/* ─── Summary rail ─── */}
            <motion.aside
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="lg:sticky lg:top-32 lg:self-start space-y-4"
            >
              <div className="rounded-2xl border border-white/[0.06] bg-card/40 backdrop-blur-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary/80">
                    {language === 'es' ? 'Resumen' : 'Summary'}
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">
                    {String(itemCount).padStart(2, '0')} {language === 'es' ? 'uds' : 'units'}
                  </span>
                </div>

                <dl className="space-y-2.5 text-[13px]">
                  <div className="flex justify-between items-baseline">
                    <dt className="text-muted-foreground">{t.cart.subtotal}</dt>
                    <dd className="font-mono tabular-nums text-foreground">${subtotal.toFixed(2)}</dd>
                  </div>
                  {discount && discountAmount > 0 && (
                    <div className="flex justify-between items-baseline">
                      <dt className="text-primary font-mono text-[11px] uppercase tracking-wider">{discount.code}</dt>
                      <dd className="font-mono tabular-nums text-primary">−${discountAmount.toFixed(2)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline">
                    <dt className="text-muted-foreground">{language === 'es' ? 'Envío' : 'Shipping'}</dt>
                    <dd className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground/70">
                      {language === 'es' ? 'En checkout' : 'At checkout'}
                    </dd>
                  </div>
                </dl>

                <div className="pt-3 mt-3 border-t border-white/[0.06]">
                  <DiscountCodeInput />
                </div>

                <div className="h-px bg-white/[0.06] my-4" />

                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{t.cart.total}</span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={finalTotal.toFixed(2)}
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 30 }}
                      className="font-display font-bold text-2xl text-foreground tabular-nums tracking-tight"
                    >
                      ${finalTotal.toFixed(2)}
                    </motion.span>
                  </AnimatePresence>
                </div>

                <motion.div whileTap={{ scale: 0.99 }} className="mt-5">
                  <Button
                    onClick={handleCheckout}
                    className="w-full bg-gradient-gold text-primary-foreground font-bold gap-2 h-12 text-[14px] shadow-[0_0_30px_hsl(var(--primary)/0.25)] hover:shadow-[0_0_50px_hsl(var(--primary)/0.5)] transition-all rounded-full tracking-tight"
                  >
                    {t.cart.checkout}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.div>

                <Link to="/" className="block mt-3">
                  <button className="w-full font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors inline-flex items-center justify-center gap-1.5 py-2">
                    <ArrowLeft className="w-3 h-3" />
                    {t.cart.continueShopping}
                  </button>
                </Link>

                <p className="text-center text-[10px] text-muted-foreground/80 mt-3 font-mono uppercase tracking-[0.2em] inline-flex items-center justify-center gap-1.5 w-full">
                  <Lock className="w-2.5 h-2.5" />
                  Secure · TLS 1.3
                </p>
              </div>
            </motion.aside>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
