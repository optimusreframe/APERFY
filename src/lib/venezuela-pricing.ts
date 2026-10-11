export type VenezuelaPriceMode = 'global' | 'manual';
export type VenezuelaManualMode = 'fixed' | 'percentage';

export const DEFAULT_VENEZUELA_MARKUP_PERCENT = 40;

export function normalizeVenezuelaMarkup(value: unknown, fallback = DEFAULT_VENEZUELA_MARKUP_PERCENT): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(1000, Math.max(0, parsed));
}

export function calculateVenezuelaUsdPrice({
  usaPrice,
  mode = 'global',
  manualMode = 'fixed',
  fixedPrice,
  markupPercent,
  globalMarkupPercent = DEFAULT_VENEZUELA_MARKUP_PERCENT,
}: {
  usaPrice: number;
  mode?: VenezuelaPriceMode | string | null;
  manualMode?: VenezuelaManualMode | string | null;
  fixedPrice?: number | null;
  markupPercent?: number | null;
  globalMarkupPercent?: number | null;
}): number {
  const base = Math.max(0, Number(usaPrice) || 0);
  const resolvedMode = mode === 'manual' ? 'manual' : 'global';
  if (resolvedMode === 'manual' && manualMode === 'fixed') {
    return Math.max(0, Number(fixedPrice) || 0);
  }
  const markup = normalizeVenezuelaMarkup(
    resolvedMode === 'manual' ? markupPercent : globalMarkupPercent,
    DEFAULT_VENEZUELA_MARKUP_PERCENT,
  );
  return Math.round(base * (1 + markup / 100) * 100) / 100;
}
