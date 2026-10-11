import { describe, expect, it } from 'vitest';
import { calculateVenezuelaUsdPrice, normalizeVenezuelaMarkup } from './venezuela-pricing';

describe('venezuela pricing', () => {
  it('applies the configured global markup', () => {
    expect(calculateVenezuelaUsdPrice({
      usaPrice: 20,
      mode: 'global',
      manualMode: 'fixed',
      fixedPrice: 0,
      globalMarkupPercent: 40,
    })).toBe(28);
  });

  it('keeps a manual fixed price independent from the global rule', () => {
    expect(calculateVenezuelaUsdPrice({
      usaPrice: 20,
      mode: 'manual',
      manualMode: 'fixed',
      fixedPrice: 30,
      globalMarkupPercent: 40,
    })).toBe(30);
  });

  it('supports a manual percentage per product', () => {
    expect(calculateVenezuelaUsdPrice({
      usaPrice: 20,
      mode: 'manual',
      manualMode: 'percentage',
      fixedPrice: 0,
      markupPercent: 25,
      globalMarkupPercent: 40,
    })).toBe(25);
  });

  it('normalizes invalid or unsafe percentages', () => {
    expect(normalizeVenezuelaMarkup('not-a-number')).toBe(40);
    expect(normalizeVenezuelaMarkup(1200)).toBe(1000);
    expect(normalizeVenezuelaMarkup(-2)).toBe(0);
  });
});
