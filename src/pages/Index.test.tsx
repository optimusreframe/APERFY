import { describe, expect, it } from 'vitest';
import { getHomepageCopy } from './homepage-copy';

describe('homepage copy', () => {
  it('localizes the APERFY deal-store proposition', () => {
    expect(getHomepageCopy('en').title).toContain('Big deals');
    expect(getHomepageCopy('en').highlight).toMatch(/small quantities/i);
    expect(getHomepageCopy('es').title).toContain('Grandes ofertas');
    expect(JSON.stringify(getHomepageCopy('en'))).not.toMatch(/signal/i);
    expect(JSON.stringify(getHomepageCopy('es'))).not.toMatch(/señal/i);
    expect(getHomepageCopy('en').description).not.toMatch(/3d|print/i);
  });
});
