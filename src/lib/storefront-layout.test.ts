import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STOREFRONT_LAYOUT,
  getStorefrontDesignForWidth,
  getStorefrontDeviceForWidth,
  parseStorefrontLayoutConfig,
  serializeStorefrontLayoutConfig,
} from './storefront-layout';

describe('storefront layout settings', () => {
  it('falls back to the current APERFY layout for missing or invalid settings', () => {
    expect(parseStorefrontLayoutConfig(null)).toEqual(DEFAULT_STOREFRONT_LAYOUT);
    expect(parseStorefrontLayoutConfig('{"mobile":"unknown"}')).toEqual(DEFAULT_STOREFRONT_LAYOUT);
  });

  it('migrates the previous single-design setting to all device sizes', () => {
    expect(parseStorefrontLayoutConfig('{"design":"design3"}')).toEqual({
      mobile: 'design3',
      tablet: 'design3',
      desktop: 'design3',
    });
  });

  it('round-trips independent designs for mobile, iPad and desktop', () => {
    const config = { mobile: 'design2' as const, tablet: 'design3' as const, desktop: 'design4' as const };
    expect(parseStorefrontLayoutConfig(serializeStorefrontLayoutConfig(config))).toEqual(config);
  });

  it('resolves the selected design at each responsive breakpoint', () => {
    const config = { mobile: 'design2' as const, tablet: 'design3' as const, desktop: 'design4' as const };
    expect(getStorefrontDeviceForWidth(390)).toBe('mobile');
    expect(getStorefrontDeviceForWidth(767)).toBe('mobile');
    expect(getStorefrontDeviceForWidth(768)).toBe('tablet');
    expect(getStorefrontDeviceForWidth(1023)).toBe('tablet');
    expect(getStorefrontDeviceForWidth(1024)).toBe('desktop');
    expect(getStorefrontDesignForWidth(config, 390)).toBe('design2');
    expect(getStorefrontDesignForWidth(config, 768)).toBe('design3');
    expect(getStorefrontDesignForWidth(config, 1440)).toBe('design4');
  });
});
