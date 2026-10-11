import { describe, expect, it } from 'vitest';
import { formatRegionalPrice, getDisplayPrice, getRegionalUsdPrice, type PricingContext } from './regional-pricing';

const venezuela: PricingContext = { region: 'VENEZUELA', mode: 'geo', currency: 'USD', bcvRate: 100 };

describe('regional pricing', () => {
  it('uses only the regional price list in GEO mode', () => {
    expect(getRegionalUsdPrice(20, 30, venezuela)).toBe(30);
    expect(getRegionalUsdPrice(20, 30, { region: 'USA', mode: 'geo' })).toBe(20);
  });

  it('keeps GLOBAL Venezuela on the USA price list', () => {
    expect(getRegionalUsdPrice(20, 30, { region: 'VENEZUELA', mode: 'global' })).toBe(20);
  });

  it('converts the selected regional USD price to VES only when requested', () => {
    expect(getDisplayPrice(30, venezuela, 'VES')).toBe(3000);
    expect(formatRegionalPrice(30, venezuela, 'USD')).toContain('30.00');
  });
});
