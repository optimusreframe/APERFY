import { describe, expect, it } from 'vitest';
import { DEFAULT_SEO_SETTINGS, getSeoCopyForPath, getSeoImageForPath, parseSeoSettings, serializeSeoSettings } from './seo-settings';

describe('seo settings', () => {
  it('uses page-specific images and falls back to the default image', () => {
    const settings = { ...DEFAULT_SEO_SETTINGS, home_image_url: 'https://cdn.test/home.jpg' };

    expect(getSeoImageForPath('/', settings)).toBe('https://cdn.test/home.jpg');
    expect(getSeoImageForPath('/cart', settings)).toBe(DEFAULT_SEO_SETTINGS.default_image_url);
  });

  it('sanitizes saved values while preserving the SEO contract', () => {
    const parsed = parseSeoSettings(serializeSeoSettings({ title_en: '<b>Shop</b>', robots_index: false }));

    expect(parsed.title_en).toBe('Shop');
    expect(parsed.robots_index).toBe(false);
    expect(getSeoCopyForPath('/ask', 'en', parsed).title).toContain('Request a product');
  });
});
