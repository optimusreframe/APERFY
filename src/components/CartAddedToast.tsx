import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ShoppingBag } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';

const AUTO_DISMISS_MS = 6000;

export default function CartAddedToast() {
  const { lastAdded, dismissLastAdded, itemCount, getTotal } = useCart();
  const { language } = useLanguage();
  const location = useLocation();
  const [progress, setProgress] = useState(100);

  const hidden = location.pathname === '/cart' || location.pathname.startsWith('/checkout');

  useEffect(() => {
    if (!lastAdded || hidden) return;
    setProgress(100);
    const start = Date.now();
    const tick = setInterval(() => {
      const remaining = Math.max(0, AUTO_DISMISS_MS - (Date.now() - start));
      setProgress((remaining / AUTO_DISMISS_MS) * 100);
      if (remaining <= 0) {
        clearInterval(tick);
        dismissLastAdded();
      }
    }, 50);
    return () => clearInterval(tick);
  }, [lastAdded, hidden, dismissLastAdded]);

  const t = {
    added: language === 'es' ? 'Añadido al carrito' : 'Added to cart',
    continue: language === 'es' ? 'Seguir comprando' : 'Continue shopping',
    viewCart: language === 'es' ? 'Ver carrito' : 'View cart',
    items: language === 'es' ? 'artículos' : 'items',
  };

  return (
    <AnimatePresence>
      {lastAdded && !hidden && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 z-[100] w-auto sm:w-[380px] pointer-events-auto"
        >
          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-border/30">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/60 transition-[width] duration-75 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="relative shrink-0">
                  {lastAdded.item.productImage ? (
                    <img
                      src={lastAdded.item.productImage}
                      alt=""
                      className="w-14 h-14 rounded-xl object-cover bg-muted"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center ring-2 ring-card">
                    <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
                  </div>
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-xs font-medium uppercase tracking-wider text-primary">
                    {t.added}
                  </p>
                  <p className="text-sm font-semibold text-foreground truncate mt-0.5">
                    {lastAdded.item.productName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {itemCount} {t.items} · ${getTotal().toFixed(2)}
                  </p>
                </div>

                <button
                  onClick={dismissLastAdded}
                  className="shrink-0 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={dismissLastAdded}
                  className="rounded-lg"
                >
                  {t.continue}
                </Button>
                <Button
                  asChild
                  size="sm"
                  onClick={dismissLastAdded}
                  className="rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90"
                >
                  <Link to="/cart">{t.viewCart}</Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
