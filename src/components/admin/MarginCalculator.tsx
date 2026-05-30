import { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

/**
 * Inline margin calculator: price − (material cost / kg × weight g / 1000) − shipping.
 * Shows margin in $ and %.
 */
export default function MarginCalculator({
  defaultPrice = 0,
  defaultWeight = 0,
  defaultCostPerKg = 0,
}: {
  defaultPrice?: number;
  defaultWeight?: number;
  defaultCostPerKg?: number;
}) {
  const [price, setPrice] = useState<number>(defaultPrice);
  const [weight, setWeight] = useState<number>(defaultWeight);
  const [cost, setCost] = useState<number>(defaultCostPerKg);
  const [shipping, setShipping] = useState<number>(0);

  const materialCost = useMemo(() => (cost * weight) / 1000, [cost, weight]);
  const margin = useMemo(() => price - materialCost - shipping, [price, materialCost, shipping]);
  const marginPct = useMemo(() => (price > 0 ? (margin / price) * 100 : 0), [margin, price]);

  const healthy = marginPct >= 40;
  const warn = marginPct >= 20 && marginPct < 40;

  return (
    <div className="rounded-xl border border-white/10 bg-card/40 backdrop-blur-xl p-4 space-y-3">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary/80">
        <Calculator className="w-3.5 h-3.5" /> Calculadora de margen
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Precio" value={price} onChange={setPrice} prefix="$" />
        <Field label="Costo/kg" value={cost} onChange={setCost} prefix="$" />
        <Field label="Peso (g)" value={weight} onChange={setWeight} />
        <Field label="Envío" value={shipping} onChange={setShipping} prefix="$" />
      </div>
      <div className="pt-2 border-t border-white/[0.06] space-y-1.5 font-mono text-[11px]">
        <Row label="Costo material" value={`$${materialCost.toFixed(2)}`} muted />
        <Row label="Margen" value={`$${margin.toFixed(2)}`} accent={margin >= 0 ? 'gold' : 'destructive'} />
        <Row
          label="Margen %"
          value={`${marginPct.toFixed(1)}%`}
          accent={healthy ? 'gold' : warn ? 'warn' : 'destructive'}
          bold
        />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  prefix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  prefix?: string;
}) {
  return (
    <div>
      <Label className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="relative mt-1">
        {prefix && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground/60">
            {prefix}
          </span>
        )}
        <Input
          type="number"
          inputMode="decimal"
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={`h-8 text-xs font-mono tabular-nums ${prefix ? 'pl-5' : ''}`}
        />
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
  muted,
  bold,
}: {
  label: string;
  value: string;
  accent?: 'gold' | 'destructive' | 'warn';
  muted?: boolean;
  bold?: boolean;
}) {
  const color =
    accent === 'gold'
      ? 'text-primary'
      : accent === 'destructive'
        ? 'text-destructive'
        : accent === 'warn'
          ? 'text-yellow-500'
          : muted
            ? 'text-muted-foreground'
            : 'text-foreground';
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground/80 uppercase tracking-wider">{label}</span>
      <span className={`tabular-nums ${color} ${bold ? 'font-bold text-[13px]' : ''}`}>{value}</span>
    </div>
  );
}
