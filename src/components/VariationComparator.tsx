import { useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Columns3, Check, Weight, Ruler } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

interface Variation {
  id: string;
  type: string;
  name_en: string;
  name_es: string;
  value: string;
  price_modifier: number;
  price_override?: number | null;
  use_manual_price?: boolean;
  weight_grams?: number | null;
  dimensions?: string | null;
  image_url?: string | null;
}

interface Props {
  variations: Variation[];
  basePrice: number;
  productImages?: string[];
}

const effective = (v: Variation, base: number) =>
  v.use_manual_price && v.price_override != null
    ? Number(v.price_override)
    : base + Number(v.price_modifier || 0);

export default function VariationComparator({ variations, basePrice, productImages = [] }: Props) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);

  // Group by type (size, color, etc.) but the comparator shows the active type the user is browsing.
  const sizeVariations = variations.filter((v) => v.type === 'size');
  const list = sizeVariations.length > 1 ? sizeVariations : variations;

  if (list.length < 2) return null;

  const best = list.reduce((min, v) => (effective(v, basePrice) < effective(min, basePrice) ? v : min), list[0]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] border-white/10 hover:border-primary/30"
        >
          <Columns3 className="w-3.5 h-3.5" />
          {language === 'es' ? 'Comparar' : 'Compare'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl bg-card/95 backdrop-blur-2xl border-white/10">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-tight">
            {language === 'es' ? 'Comparar variaciones' : 'Compare variations'}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-x-auto -mx-6 px-6 pb-2">
          <div
            className="grid gap-3 min-w-fit"
            style={{ gridTemplateColumns: `repeat(${list.length}, minmax(180px, 1fr))` }}
          >
            {list.map((v, i) => {
              const price = effective(v, basePrice);
              const img = v.image_url || productImages[0];
              const isBest = v.id === best.id;
              return (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`relative rounded-2xl border p-4 bg-background/60 ${
                    isBest ? 'border-primary/40 shadow-[0_0_24px_-8px_hsl(var(--primary)/0.4)]' : 'border-white/10'
                  }`}
                >
                  {isBest && (
                    <span className="absolute -top-2 left-3 font-mono text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full bg-gradient-gold text-primary-foreground">
                      {language === 'es' ? 'Mejor precio' : 'Best price'}
                    </span>
                  )}
                  {img && (
                    <div className="aspect-square rounded-xl overflow-hidden bg-secondary/50 mb-3">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="font-display font-semibold text-sm truncate">
                    {language === 'es' ? v.name_es || v.name_en : v.name_en}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                    {v.type} · {v.value}
                  </div>
                  <div className="mt-3 font-display font-bold text-2xl tabular-nums text-gradient-gold">
                    ${price.toFixed(2)}
                  </div>
                  <ul className="mt-3 space-y-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground/80">
                    {v.weight_grams ? (
                      <li className="flex items-center gap-1.5">
                        <Weight className="w-3 h-3" /> {v.weight_grams}g
                      </li>
                    ) : null}
                    {v.dimensions ? (
                      <li className="flex items-center gap-1.5">
                        <Ruler className="w-3 h-3" /> {v.dimensions}mm
                      </li>
                    ) : null}
                    <li className="flex items-center gap-1.5 text-primary/80">
                      <Check className="w-3 h-3" /> {language === 'es' ? 'Disponible' : 'Available'}
                    </li>
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
