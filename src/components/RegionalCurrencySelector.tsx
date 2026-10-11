import { Banknote, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useRegionalPricing } from '@/contexts/RegionalPricingContext';

export default function RegionalCurrencySelector() {
  const { language } = useLanguage();
  const { pricing, currency, setCurrency, canUseVes } = useRegionalPricing();

  if (pricing.region !== 'VENEZUELA') return null;

  return (
    <label className="relative inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-background/70 px-2.5 py-2 text-xs font-semibold text-foreground shadow-sm">
      <Banknote className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      <span className="sr-only">{language === 'es' ? 'Moneda' : 'Currency'}</span>
      <select
        value={currency}
        onChange={(event) => setCurrency(event.target.value as 'USD' | 'VES')}
        disabled={!canUseVes}
        aria-label={language === 'es' ? 'Seleccionar moneda' : 'Select currency'}
        className="appearance-none bg-transparent pr-3 text-xs font-semibold outline-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="USD">USD</option>
        <option value="VES" disabled={!canUseVes}>VES</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-1 h-3 w-3 text-muted-foreground" aria-hidden="true" />
    </label>
  );
}
