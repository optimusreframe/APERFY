import { useEffect, useRef, useState, RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Minus, Plus, Box } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';

interface Props {
  image: string | null;
  variationLabel?: string | null;
  unitPrice: number;
  totalPrice: number;
  quantity: number;
  setQuantity: (n: number) => void;
  needsVariation: boolean;
  onAdd: () => void;
  /** ref to the inline (desktop) CTA — when visible on screen, the floating dock hides */
  inlineCtaRef?: RefObject<HTMLElement>;
}

export default function MobileStickyAddToCart({
  image,
  variationLabel,
  totalPrice,
  quantity,
  setQuantity,
  needsVariation,
  onAdd,
  inlineCtaRef,
}: Props) {
  const { language } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [shake, setShake] = useState(false);
  const [flying, setFlying] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [flyTarget, setFlyTarget] = useState<{ x: number; y: number } | null>(null);

  // Show only after scrolling past hero area
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setVisible(y > 320);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Hide when the inline CTA is in view (so we don't double up)
  useEffect(() => {
    const el = inlineCtaRef?.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(false);
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [inlineCtaRef]);

  const handleAdd = () => {
    if (needsVariation) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    // haptic
    try { (navigator as any).vibrate?.(10); } catch {}

    // fly-to-cart anim — measure cart icon in bottom tab bar
    const cartIcon = document.querySelector('[data-mobile-cart-icon]') as HTMLElement | null;
    const start = previewRef.current?.getBoundingClientRect();
    if (cartIcon && start) {
      const end = cartIcon.getBoundingClientRect();
      setFlyTarget({
        x: end.left + end.width / 2 - (start.left + start.width / 2),
        y: end.top + end.height / 2 - (start.top + start.height / 2),
      });
      setFlying(true);
      setTimeout(() => { setFlying(false); setFlyTarget(null); }, 700);
    }
    onAdd();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{
            y: shake ? [0, -4, 4, -3, 3, 0] : 0,
            opacity: 1,
          }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="fixed left-3 right-3 z-40 lg:hidden md:hidden"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)' }}
        >
          <div className="relative rounded-2xl border border-primary/20 bg-background/70 backdrop-blur-2xl shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.35),0_0_0_1px_hsl(var(--primary)/0.05)] px-3 py-2.5 flex items-center gap-3 overflow-hidden">
            {/* subtle gold sheen */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/[0.04] to-primary/0" />

            {/* mini preview */}
            <motion.div
              ref={previewRef}
              whileTap={{ rotateY: 180 }}
              transition={{ duration: 0.5 }}
              className="relative w-11 h-11 rounded-xl overflow-hidden bg-card border border-white/[0.08] shrink-0"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {image ? (
                <img src={image} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Box className="w-5 h-5 text-muted-foreground/40" />
                </div>
              )}
              {/* flying clone */}
              <AnimatePresence>
                {flying && flyTarget && image && (
                  <motion.img
                    src={image}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{ x: flyTarget.x, y: flyTarget.y, opacity: 0, scale: 0.3 }}
                    transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
                    className="absolute inset-0 w-full h-full object-cover rounded-xl pointer-events-none z-50"
                    style={{ position: 'fixed', width: 44, height: 44 }}
                  />
                )}
              </AnimatePresence>
            </motion.div>

            {/* info */}
            <div className="flex-1 min-w-0 leading-tight">
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground truncate">
                {variationLabel || (language === 'es' ? 'Estándar' : 'Standard')}
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={totalPrice.toFixed(2)}
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 2 }}
                  transition={{ duration: 0.15 }}
                  className="text-[17px] font-semibold text-gradient-gold tabular-nums tracking-tight"
                >
                  ${totalPrice.toFixed(2)}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* stepper */}
            <div className="inline-flex items-center gap-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] p-0.5 shrink-0">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-7 h-7 rounded-full hover:bg-white/[0.06] flex items-center justify-center transition-colors"
                aria-label="decrease"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="font-mono font-semibold text-[12px] w-6 text-center tabular-nums">
                {String(quantity).padStart(2, '0')}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-7 h-7 rounded-full hover:bg-white/[0.06] flex items-center justify-center transition-colors"
                aria-label="increase"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* CTA */}
            <motion.div whileTap={{ scale: 0.96 }}>
              <Button
                onClick={handleAdd}
                disabled={needsVariation}
                className="h-10 px-4 rounded-full bg-gradient-gold text-primary-foreground font-bold gap-1.5 shadow-[0_0_20px_hsl(var(--primary)/0.35)] disabled:opacity-60"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="text-[12px]">{language === 'es' ? 'Agregar' : 'Add'}</span>
              </Button>
            </motion.div>
          </div>
          {needsVariation && (
            <div className="text-center mt-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-primary/70">
              {language === 'es' ? 'Selecciona variante' : 'Select a variant'}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
