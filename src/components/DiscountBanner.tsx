import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Tag, X, Copy, Check } from 'lucide-react';

interface PromoCode {
  id: string;
  code: string;
  banner_text_en: string | null;
  banner_text_es: string | null;
  expires_at: string | null;
  discount_type: string;
  discount_value: number;
}

function useCountdown(target: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s };
}

export default function DiscountBanner() {
  const { language } = useLanguage();
  const [promo, setPromo] = useState<PromoCode | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const cd = useCountdown(promo?.expires_at || null);

  useEffect(() => {
    if (sessionStorage.getItem('promo-dismissed') === '1') { setDismissed(true); return; }
    supabase.from('discount_codes')
      .select('id, code, banner_text_en, banner_text_es, expires_at, discount_type, discount_value')
      .eq('is_active', true).eq('show_banner', true)
      .lte('starts_at', new Date().toISOString())
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        if (data.expires_at && new Date(data.expires_at) < new Date()) return;
        setPromo(data as PromoCode);
      });
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('promo-dismissed', '1');
  };

  const handleCopy = async () => {
    if (!promo) return;
    await navigator.clipboard.writeText(promo.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (!promo || dismissed) return null;

  const text = language === 'es'
    ? (promo.banner_text_es || promo.banner_text_en || `${promo.discount_value}${promo.discount_type === 'percentage' ? '%' : '$'} de descuento`)
    : (promo.banner_text_en || promo.banner_text_es || `${promo.discount_value}${promo.discount_type === 'percentage' ? '%' : '$'} off`);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        className="sticky top-0 z-[60] w-full bg-gradient-gold text-primary-foreground"
      >
        <div className="max-w-7xl mx-auto px-4 h-10 flex items-center justify-between gap-3 text-[12px] font-medium">
          <div className="flex items-center gap-2 min-w-0">
            <Tag className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{text}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-background/15 hover:bg-background/25 transition-colors font-mono text-[11px] uppercase tracking-wider"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{promo.code}</span>
            </button>
            {cd && (
              <div className="hidden sm:flex items-center gap-1 font-mono text-[10px] tabular-nums">
                {cd.d > 0 && <span>{cd.d}d</span>}
                <span>{String(cd.h).padStart(2, '0')}:{String(cd.m).padStart(2, '0')}:{String(cd.s).padStart(2, '0')}</span>
              </div>
            )}
            <button onClick={handleDismiss} className="p-1 rounded hover:bg-background/15 transition-colors" aria-label="Dismiss">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
