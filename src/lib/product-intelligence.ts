export const DEFAULT_MARKET_DISCOUNT_PERCENT = 20;

export function suggestRetailPrice(marketPrice: number, discountPercent = DEFAULT_MARKET_DISCOUNT_PERCENT): number {
  const price = Number.isFinite(marketPrice) ? Math.max(0, marketPrice) : 0;
  const discount = Math.min(90, Math.max(0, Number.isFinite(discountPercent) ? discountPercent : DEFAULT_MARKET_DISCOUNT_PERCENT));
  return Math.round(price * (1 - discount / 100) * 100) / 100;
}

export function normalizeVariantType(value: string): string {
  const normalized = value.trim().toLowerCase();
  return ['color', 'size', 'capacity', 'storage', 'finish', 'pack', 'custom'].includes(normalized) ? normalized : 'custom';
}
