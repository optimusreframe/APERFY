import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Minus, Plus, Box, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { MOBILE_BOTTOM_NAV_OFFSET } from '@/components/layout/scrollToTop';

interface Props {
  image: string | null;
  variationLabel?: string | null;
  productName?: string | null;
  unitPrice: number;
  totalPrice: number;
  quantity: number;
  setQuantity: (n: number) => void;
  needsVariation: boolean;
  inStock?: boolean;
  onAdd: () => void;
}

export default function MobileStickyAddToCart({
  image,
  variationLabel,
  productName,
  unitPrice,
  totalPrice,
  quantity,
  setQuantity,
  needsVariation,
  inStock = true,
  onAdd,
}: Props) {
  const { language } = useLanguage();
  const [shake, setShake] = useState(false);
  const [flying, setFlying] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [flyTarget, setFlyTarget] = useState<{ x: number; y: number } | null>(null);

  const disabled = needsVariation || !inStock;

  const handleAdd = () => {
    if (disabled) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    try { navigator.vibrate?.(10); } catch (error: unknown) { console.debug('Haptic feedback unavailable', error); }

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

  const ctaLabel = !inStock
    ? (language === 'es' ? 'Agotado' : 'Out of stock')
    : needsVariation
      ? (language === 'es' ? 'Seleccionar' : 'Select')
      : (language === 'es' ? 'Agregar' : 'Add');

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{
        y: shake ? [0, -4, 4, -3, 3, 0] : 0,
        opacity: 1,
      }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      data-testid="mobile-add-to-cart-dock"
      className="fixed inset-x-0 z-[60] md:hidden"
      style={{
        bottom: MOBILE_BOTTOM_NAV_OFFSET,
        left: 'env(safe-area-inset-left, 0px)',
        right: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <div className="relative flex min-h-16 items-center gap-2 border-t border-white/[0.1] bg-background/95 px-3 py-2 shadow-[0_-12px_32px_-18px_hsl(0_0%_0%/0.8)] backdrop-blur-xl">
        <div
          ref={previewRef}
          className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-white/[0.1] bg-card"
        >
          {image ? (
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Box className="h-5 w-5 text-muted-foreground/40" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[11px] font-medium text-foreground">
            {productName ? `${productName}` : (language === 'es' ? 'Producto' : 'Product')}
            {variationLabel ? <span className="text-muted-foreground"> · {variationLabel}</span> : null}
          </div>
          <div className="flex items-center gap-1.5">
            <AnimatePresence mode="wait">
              <motion.span
                key={totalPrice.toFixed(2)}
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 2 }}
                transition={{ duration: 0.15 }}
                className="text-[15px] font-bold text-gradient-gold tabular-nums tracking-tight"
              >
                ${totalPrice.toFixed(2)}
              </motion.span>
            </AnimatePresence>
            {quantity > 1 && (
              <span className="hidden font-mono text-[9px] text-muted-foreground tabular-nums min-[430px]:inline">
                ${unitPrice.toFixed(2)} × {quantity}
              </span>
            )}
          </div>
        </div>

        <div
          className={`shrink-0 ${inStock ? 'text-emerald-400/90' : 'text-destructive/90'}`}
          aria-label={inStock ? (language === 'es' ? 'En stock' : 'In stock') : (language === 'es' ? 'Agotado' : 'Sold out')}
        >
          <span className={`block h-2 w-2 rounded-full ${inStock ? 'bg-emerald-400' : 'bg-destructive'}`} />
        </div>

        <div className="inline-flex shrink-0 items-center rounded-full border border-white/[0.08] bg-white/[0.05] p-0.5">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="flex h-11 w-11 items-center justify-center rounded-full touch-manipulation transition-colors hover:bg-white/[0.08]"
            aria-label="decrease"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-5 text-center font-mono text-[12px] font-semibold tabular-nums">
            {String(quantity).padStart(2, '0')}
          </span>
          <button
            type="button"
            onClick={() => setQuantity(quantity + 1)}
            className="flex h-11 w-11 items-center justify-center rounded-full touch-manipulation transition-colors hover:bg-white/[0.08]"
            aria-label="increase"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={handleAdd}
          className={`group flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 font-bold text-[12px] touch-manipulation transition-all ${
            disabled
              ? 'bg-white/[0.06] text-muted-foreground border border-white/[0.06]'
              : 'bg-gradient-gold text-primary-foreground shadow-[0_0_18px_hsl(var(--primary)/0.28)]'
          }`}
        >
          <ShoppingCart className="h-4 w-4 shrink-0" />
          <span className="truncate">{ctaLabel}</span>
          {!disabled && (
            <ArrowRight className="hidden h-4 w-4 shrink-0 transition-transform group-active:translate-x-1 min-[430px]:block" />
          )}
        </motion.button>

        {/* flying clone */}
        <AnimatePresence>
          {flying && flyTarget && image && (
            <motion.img
              src={image}
              initial={{
                x: previewRef.current?.getBoundingClientRect().left ?? 0,
                y: previewRef.current?.getBoundingClientRect().top ?? 0,
                opacity: 1,
                scale: 1,
              }}
              animate={{
                x: (previewRef.current?.getBoundingClientRect().left ?? 0) + flyTarget.x,
                y: (previewRef.current?.getBoundingClientRect().top ?? 0) + flyTarget.y,
                opacity: 0,
                scale: 0.3,
              }}
              transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
              className="pointer-events-none rounded-xl object-cover z-50"
              style={{ position: 'fixed', width: 44, height: 44, left: 0, top: 0 }}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
