import { describe, expect, it } from 'vitest';
import { getHomepageCopy } from './homepage-copy';
import { DEFAULT_HOMEPAGE_HERO_CONFIG } from '@/lib/homepage-settings';

describe('homepage copy', () => {
  it('localizes the APERFY deal-store proposition', () => {
    expect(`${getHomepageCopy('en').title} ${getHomepageCopy('en').highlight}`).toMatch(/great deals/i);
    expect(`${getHomepageCopy('en').title} ${getHomepageCopy('en').highlight}`).toMatch(/prices/i);
    expect(getHomepageCopy('en').secondaryCta).toMatch(/request/i);
    expect(getHomepageCopy('es').title).toContain('Grandes ofertas');
    expect(`${getHomepageCopy('es').title} ${getHomepageCopy('es').highlight}`).toMatch(/precios/i);
    expect(`${getHomepageCopy('es').title} ${getHomepageCopy('es').highlight}`).not.toMatch(/Cantidades peque/);
    expect(getHomepageCopy('es').secondaryCta).toMatch(/producto/i);
    expect(JSON.stringify(getHomepageCopy('en'))).not.toMatch(/signal/i);
    expect(JSON.stringify(getHomepageCopy('es'))).not.toMatch(/señal/i);
    expect(getHomepageCopy('en').description).not.toMatch(/3d|print/i);
  });

  it('keeps hero CTA edits separate from the storefront CTA copy', () => {
    const copy = getHomepageCopy('es', { ...DEFAULT_HOMEPAGE_HERO_CONFIG, secondary_cta_es: 'Ver condiciones' });
    expect(copy.heroSecondaryCta).toBe('Ver condiciones');
    expect(copy.secondaryCta).toBe(DEFAULT_HOMEPAGE_HERO_CONFIG.secondary_cta_es);
  });
});
