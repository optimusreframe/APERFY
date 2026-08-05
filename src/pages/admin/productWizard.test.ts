import { describe, expect, it } from 'vitest';
import { getNextWizardStep, getPreviousWizardStep, getWizardStepError } from './productWizard';

describe('product wizard navigation', () => {
  it('moves within the five product steps without overflowing', () => {
    expect(getNextWizardStep(0)).toBe(1);
    expect(getNextWizardStep(4)).toBe(4);
    expect(getPreviousWizardStep(3)).toBe(2);
    expect(getPreviousWizardStep(0)).toBe(0);
  });

  it('requires identity before allowing the wizard to advance', () => {
    expect(getWizardStepError(1, { name_es: '', name_en: 'Headphones', slug: 'headphones', base_price: 20 })).toContain('español');
    expect(getWizardStepError(1, { name_es: 'Audífonos', name_en: 'Headphones', slug: 'headphones', base_price: 20 })).toBeNull();
  });
});

