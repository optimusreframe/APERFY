import { describe, expect, it } from 'vitest';
import { mergeCartItem } from '@/contexts/CartContext';
import type { CartItem } from '@/contexts/CartContext';

const item = (productId: string, quantity = 1): CartItem => ({
  productId,
  productName: `Product ${productId}`,
  productImage: '',
  slug: productId,
  quantity,
  unitPrice: 10,
  selectedVariations: [],
  notes: '',
});

describe('cart multi-product behavior', () => {
  it('keeps different products as separate line items before checkout', () => {
    const first = mergeCartItem([], item('product-a'));
    const second = mergeCartItem(first, item('product-b', 2));

    expect(second).toHaveLength(2);
    expect(second.map(line => [line.productId, line.quantity])).toEqual([
      ['product-a', 1],
      ['product-b', 2],
    ]);
  });

  it('combines repeated additions of the same product without losing the line', () => {
    const merged = mergeCartItem([item('product-a', 2)], item('product-a', 3));

    expect(merged).toHaveLength(1);
    expect(merged[0].quantity).toBe(5);
  });
});
