import { describe, expect, it } from 'vitest';
import { normalizeInventoryPath } from './paths';

describe('inventory import paths', () => {
  it('normalizes Windows separators without relying on replaceAll', () => {
    expect(normalizeInventoryPath('photos\\products\\item.jpg')).toBe('photos/products/item.jpg');
  });
});
