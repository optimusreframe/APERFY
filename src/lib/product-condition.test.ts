import { describe, expect, it } from 'vitest';
import { inferProductCondition, normalizeProductCondition } from './product-condition';

describe('product condition', () => {
  it('normalizes explicit condition labels', () => {
    expect(normalizeProductCondition('USED')).toBe('used');
    expect(normalizeProductCondition('new')).toBe('new');
    expect(normalizeProductCondition('open box')).toBe('used');
    expect(normalizeProductCondition('unknown')).toBeNull();
  });

  it('prioritizes an explicit condition field over descriptive text', () => {
    expect(inferProductCondition({ Condition: 'new', Description: 'Used only for display' })).toBe('new');
    expect(inferProductCondition({ Condition: 'used', Description: 'New in sealed packaging' })).toBe('used');
  });

  it('infers condition from the inventory description and defaults safely to new', () => {
    expect(inferProductCondition({ Item: 'OnePlus 10R', Description: 'Used black smartphone' })).toBe('used');
    expect(inferProductCondition({ Item: 'Light switch', Description: 'New and unused in original packaging' })).toBe('new');
    expect(inferProductCondition({ Item: 'USB cable', Description: 'Braided cable' })).toBe('new');
  });
});
