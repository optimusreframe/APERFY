import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Minus, Plus, Box, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

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
    try { (navigator as any).vibrate?.(10); } catch {}

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
      ? (language === 'es' ? 'Selecciona variante' : 'Select variant')
      : (language === 'es' ? 'Agregar al carrito' : 'Add to cart');

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{
        y: shake ? [0, -4, 4, -3, 3, 0] : 0,
        opacity: 1,
      }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="fixed left-2 right-2 z-50 md:hidden"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}
    >
      <div className="relative rounded-2xl border border-primary/25 bg-background/85 backdrop-blur-2xl shadow-[0_18px_50px_-12px_hsl(var(--primary)/0.45),0_0_0_1px_hsl(var(--primary)/0.08)_inset] overflow-hidden">
        {/* gold sheen */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/[0.05] to-primary/0" />

        {/* ─── Row 1 · info ─── */}
        <div className="flex items-center gap-3 px-3 pt-2.5 pb-2">
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
          </motion.div>

          <div className="flex-1 min-w-0 leading-tight">
            <div className="text-[12px] font-medium text-foreground truncate">
              {productName ? `${productName}` : (language === 'es' ? 'Producto' : 'Product')}
              {variationLabel ? <span className="text-muted-foreground"> · {variationLabel}</span> : null}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <AnimatePresence mode="wait">
                <motion.span
                  key={totalPrice.toFixed(2)}
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 2 }}
                  transition={{ duration: 0.15 }}
                  className="text-[16px] font-bold text-gradient-gold tabular-nums tracking-tight"
                >
                  ${totalPrice.toFixed(2)}
                </motion.span>
              </AnimatePresence>
              {quantity > 1 && (
                <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                  ${unitPrice.toFixed(2)} × {quantity}
                </span>
              )}
            </div>
          </div>

          <div className={`font-mono text-[9px] uppercase tracking-[0.18em] shrink-0 ${inStock ? 'text-emerald-400/90' : 'text-destructive/90'}`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle ${inStock ? 'bg-emerald-400' : 'bg-destructive'}`} />
            {inStock ? (language === 'es' ? 'En stock' : 'In stock') : (language === 'es' ? 'Agotado' : 'Sold out')}
          </div>
        </div>

        {/* divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />

        {/* ─── Row 2 · action ─── */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <div className="inline-flex items-center gap-0.5 rounded-full bg-white/[0.05] border border-white/[0.07] p-0.5 shrink-0">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-9 h-9 rounded-full hover:bg-white/[0.08] flex items-center justify-center transition-colors"
              aria-label="decrease"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono font-semibold text-[13px] w-6 text-center tabular-nums">
              {String(quantity).padStart(2, '0')}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-9 h-9 rounded-full hover:bg-white/[0.08] flex items-center justify-center transition-colors"
              aria-label="increase"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleAdd}
            className={`group flex-1 h-11 rounded-full flex items-center justify-center gap-2 font-bold text-[13px] transition-all ${
              disabled
                ? 'bg-white/[0.06] text-muted-foreground border border-white/[0.06]'
                : 'bg-gradient-gold text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.4)]'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{ctaLabel}</span>
            {!disabled && (
              <ArrowRight className="w-4 h-4 transition-transform group-active:translate-x-1" />
            )}
          </motion.button>
        </div>

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
