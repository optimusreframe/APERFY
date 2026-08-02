import { describe, expect, it } from 'vitest';
import { getPriceComparison } from './pricing';

describe('getPriceComparison', () => {
  it('calculates verified savings only with a dated reference', () => {
    expect(getPriceComparison({ aperfyPrice: 80, marketReferencePrice: 100, referenceVerifiedAt: '2026-08-02T12:00:00Z' })).toMatchObject({ verified: true, savingsAmount: 20, savingsPercent: 20 });
  });
  it('hides invalid or undated comparisons', () => {
    expect(getPriceComparison({ aperfyPrice: 80, marketReferencePrice: 0, referenceVerifiedAt: '2026-08-02' }).verified).toBe(false);
    expect(getPriceComparison({ aperfyPrice: 80, marketReferencePrice: 100 }).verified).toBe(false);
  });
});

