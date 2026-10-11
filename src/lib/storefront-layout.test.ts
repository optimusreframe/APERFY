import { describe, expect, it } from 'vitest';
import { DEFAULT_STOREFRONT_LAYOUT, parseStorefrontLayoutConfig, serializeStorefrontLayoutConfig } from './storefront-layout';

describe('storefront layout settings', () => {
  it('falls back to the current APERFY layout for missing or invalid settings', () => {
    expect(parseStorefrontLayoutConfig(null)).toEqual(DEFAULT_STOREFRONT_LAYOUT);
    expect(parseStorefrontLayoutConfig('{"design":"unknown"}')).toEqual(DEFAULT_STOREFRONT_LAYOUT);
  });

  it('round-trips a supported design', () => {
    expect(parseStorefrontLayoutConfig(serializeStorefrontLayoutConfig({ design: 'design3' }))).toEqual({ design: 'design3' });
  });
});
