import { describe, expect, it } from 'vitest';
import { getHomepageCopy } from './Index';

describe('homepage copy', () => {
  it('localizes the intelligence-layer hero', () => {
    expect(getHomepageCopy('en').title).toContain('signal');
    expect(getHomepageCopy('es').title).toContain('señal');
    expect(getHomepageCopy('en').description).not.toMatch(/3d|print/i);
  });
});
