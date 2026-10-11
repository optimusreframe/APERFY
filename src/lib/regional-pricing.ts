export type PricingRegion = 'USA' | 'VENEZUELA';
export type PricingMode = 'global' | 'geo';
export type PricingCurrency = 'USD' | 'VES';

export interface PricingContext {
  region: PricingRegion;
  mode: PricingMode;
  currency: PricingCurrency;
  bcvRate: number | null;
}

export interface StorefrontPricingPayload {
  region: PricingRegion;
  mode: PricingMode;
  currency: 'USD';
  bcvRate: number | null;
}

export function isPricingRegion(value: unknown): value is PricingRegion {
  return value === 'USA' || value === 'VENEZUELA';
}

export function isPricingMode(value: unknown): value is PricingMode {
  return value === 'global' || value === 'geo';
}

export function getDefaultPricingContext(): PricingContext {
  return { region: 'USA', mode: 'global', currency: 'USD', bcvRate: null };
}

export function canUseVes(context: PricingContext): boolean {
  return context.region === 'VENEZUELA' && Number(context.bcvRate) > 0;
}

export function getRegionalUsdPrice(
  usaPrice: number,
  venezuelaPrice: number | null | undefined,
  context: Pick<PricingContext, 'region' | 'mode'>,
): number {
  if (context.mode === 'geo' && context.region === 'VENEZUELA') {
    return Number(venezuelaPrice ?? 0);
  }
  return Number(usaPrice ?? 0);
}

export function getDisplayPrice(
  usdPrice: number,
  context: PricingContext,
  currency = context.currency,
): number {
  if (currency === 'VES' && canUseVes(context)) {
    return Number(usdPrice) * Number(context.bcvRate);
  }
  return Number(usdPrice);
}

export function formatRegionalPrice(
  usdPrice: number,
  context: PricingContext,
  currency = context.currency,
): string {
  const displayPrice = getDisplayPrice(usdPrice, context, currency);
  const resolvedCurrency = currency === 'VES' && canUseVes(context) ? 'VES' : 'USD';
  return new Intl.NumberFormat(resolvedCurrency === 'VES' ? 'es-VE' : 'en-US', {
    style: 'currency',
    currency: resolvedCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(displayPrice);
}

export function getPriceListLabel(context: Pick<PricingContext, 'region' | 'mode'>): 'USA' | 'VENEZUELA' {
  return context.mode === 'geo' && context.region === 'VENEZUELA' ? 'VENEZUELA' : 'USA';
}
