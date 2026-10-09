import { describe, expect, it } from 'vitest';
import { filterEmptySpecifications } from './product-specifications';

describe('product specifications', () => {
  it('removes missing, whitespace-only, and placeholder values from the shopper-facing list', () => {
    expect(filterEmptySpecifications([
      { k: 'Condition', v: 'NEW' },
      { k: 'Category', v: 'Electronics' },
      { k: 'Weight', v: null },
      { k: 'Dimensions', v: '   ' },
      { k: 'Variants', v: '—' },
      { k: 'SKU', v: 'PRD-1234' },
    ])).toEqual([
      { k: 'Condition', v: 'NEW' },
      { k: 'Category', v: 'Electronics' },
      { k: 'SKU', v: 'PRD-1234' },
    ]);
  });
});
