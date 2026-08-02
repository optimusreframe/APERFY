import { describe, expect, it } from 'vitest';
import { findLegacyCommercialTerms, isTechnicalPrintReference } from './brand-audit';

describe('brand audit scanner', () => {
  it('finds inherited commercial 3D-printing language', () => {
    expect(findLegacyCommercialTerms('Premium 3D printing service with STL model uploads')).toEqual(expect.arrayContaining(['3d printing', 'stl', 'model upload']));
  });

  it('allows technical browser print references', () => {
    expect(isTechnicalPrintReference('window.print()')).toBe(true);
    expect(isTechnicalPrintReference('@media print')).toBe(true);
    expect(isTechnicalPrintReference('3D printing service')).toBe(false);
  });
});
