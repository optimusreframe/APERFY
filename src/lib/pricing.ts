export type PriceReferenceType = 'manufacturer' | 'retailer' | 'msrp' | 'other';

export interface PriceComparisonInput {
  aperfyPrice: number | null | undefined;
  marketReferencePrice: number | null | undefined;
  referenceType?: PriceReferenceType | null;
  referenceUrl?: string | null;
  referenceVerifiedAt?: string | null;
}

export function getPriceComparison(input: PriceComparisonInput) {
  const price = Number(input.aperfyPrice);
  const reference = Number(input.marketReferencePrice);
  const valid = Number.isFinite(price) && price >= 0 && Number.isFinite(reference) && reference > 0 && reference > price && Boolean(input.referenceVerifiedAt);
  if (!valid) return { verified: false, savingsAmount: null, savingsPercent: null };
  const savingsAmount = Math.round((reference - price) * 100) / 100;
  const savingsPercent = Math.round((savingsAmount / reference) * 1000) / 10;
  return { verified: true, savingsAmount, savingsPercent };
}

