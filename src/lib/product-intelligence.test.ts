import { describe, expect, it } from 'vitest';
import { DEFAULT_MARKET_DISCOUNT_PERCENT, normalizeVariantType, suggestRetailPrice } from './product-intelligence';

describe('product intelligence', () => {
  it('uses the APERFY default market discount', () => {
    expect(DEFAULT_MARKET_DISCOUNT_PERCENT).toBe(20);
    expect(suggestRetailPrice(100)).toBe(80);
  });

  it('clamps discount and invalid prices safely', () => {
    expect(suggestRetailPrice(100, 95)).toBe(10);
    expect(suggestRetailPrice(-10, 20)).toBe(0);
  });

  it('normalizes supported variant types and falls back to custom', () => {
    expect(normalizeVariantType(' Capacity ')).toBe('capacity');
    expect(normalizeVariantType('material')).toBe('custom');
  });
});
