import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/contexts/CartContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Tag, X, Loader2, Check } from 'lucide-react';

export default function DiscountCodeInput() {
  const { discount, applyDiscount, removeDiscount, getDiscountAmount } = useCart();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    const res = await applyDiscount(code);
    setLoading(false);
    if (res.ok) {
      toast({ title: language === 'es' ? 'Código aplicado' : 'Code applied' });
      setCode(''); setOpen(false);
    } else {
      const msgEs: Record<string, string> = {
        not_found: 'Código no encontrado', inactive: 'Código inactivo', expired: 'Código expirado',
        maxed: 'Código agotado', not_started: 'Aún no disponible', min_purchase: 'Subtotal insuficiente',
      };
      const msgEn: Record<string, string> = {
        not_found: 'Code not found', inactive: 'Code inactive', expired: 'Code expired',
        maxed: 'Code maxed out', not_started: 'Not yet available', min_purchase: 'Subtotal too low',
      };
      const map = language === 'es' ? msgEs : msgEn;
      toast({ title: map[res.error || ''] || 'Error', variant: 'destructive' });
    }
  };

  if (discount) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/[0.06] px-3 py-2"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Check className="w-3 h-3 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[11px] font-semibold text-primary truncate">{discount.code}</div>
            <div className="text-[10px] text-muted-foreground tabular-nums">
              −${getDiscountAmount().toFixed(2)}
              {' · '}
              {discount.discount_type === 'percentage' ? `${discount.discount_value}%` : `$${discount.discount_value}`}
            </div>
          </div>
        </div>
        <button onClick={removeDiscount} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    );
  }

  return (
    <div>
      <AnimatePresence mode="wait">
        {!open ? (
          <motion.button
            key="trigger" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
          >
            <Tag className="w-3 h-3" />
            {language === 'es' ? '¿Tienes un código?' : 'Have a promo code?'}
          </motion.button>
        ) : (
          <motion.div
            key="input" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex gap-2"
          >
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleApply()}
              placeholder={language === 'es' ? 'CÓDIGO' : 'CODE'}
              className="flex-1 h-9 px-3 rounded-lg bg-background border border-border text-[13px] font-mono uppercase tracking-wider outline-none focus:border-primary"
              autoFocus
            />
            <button
              onClick={handleApply} disabled={loading || !code.trim()}
              className="h-9 px-4 rounded-lg bg-foreground text-background text-[11px] font-mono uppercase tracking-wider hover:bg-foreground/90 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (language === 'es' ? 'Aplicar' : 'Apply')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
