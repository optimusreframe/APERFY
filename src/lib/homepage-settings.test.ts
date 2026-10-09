import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HOMEPAGE_HERO_CONFIG,
  getHomepageHeroCopy,
  parseHomepageHeroConfig,
  sanitizeHomepageHeroConfig,
  serializeHomepageHeroConfig,
} from './homepage-settings';

describe('homepage hero settings', () => {
  it('is disabled by default', () => {
    expect(DEFAULT_HOMEPAGE_HERO_CONFIG.enabled).toBe(false);
    expect(parseHomepageHeroConfig(null).enabled).toBe(false);
  });

  it('recovers safely from invalid or partial persisted values', () => {
    const config = parseHomepageHeroConfig('{"enabled":true,"title_es":"<b>Oferta</b>"}');
    expect(config.enabled).toBe(true);
    expect(config.title_es).toBe('Oferta');
    expect(config.description_es).toBe(DEFAULT_HOMEPAGE_HERO_CONFIG.description_es);
    expect(parseHomepageHeroConfig('{nope')).toEqual(DEFAULT_HOMEPAGE_HERO_CONFIG);
  });

  it('sanitizes content before saving and localizes the rendered hero copy', () => {
    const config = sanitizeHomepageHeroConfig({ enabled: true, primary_cta_es: '<script>alert(1)</script> Ver ofertas' });
    expect(config.primary_cta_es).toBe('alert(1) Ver ofertas');
    expect(getHomepageHeroCopy('es', config).primaryCta).toBe('alert(1) Ver ofertas');
    expect(parseHomepageHeroConfig(serializeHomepageHeroConfig(config))).toEqual(config);
  });
});
