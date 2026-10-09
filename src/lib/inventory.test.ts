import { describe, expect, it } from 'vitest';
import { getInventoryState, getInventoryLabel, type InventoryProduct } from './inventory';

const product = (overrides: Partial<InventoryProduct> = {}): InventoryProduct => ({
  inventory_enabled: true,
  stock_quantity: 10,
  low_stock_threshold: 3,
  ...overrides,
});

describe('inventory state', () => {
  it('keeps legacy products available until inventory tracking is enabled', () => {
    expect(getInventoryState(product({ inventory_enabled: false, stock_quantity: 0 }))).toBe('untracked');
  });

  it('classifies available, low-stock, and sold-out products', () => {
    expect(getInventoryState(product({ stock_quantity: 10 }))).toBe('available');
    expect(getInventoryState(product({ stock_quantity: 3 }))).toBe('low');
    expect(getInventoryState(product({ stock_quantity: 0 }))).toBe('sold_out');
  });

  it('localizes stock labels and includes the remaining quantity when low', () => {
    expect(getInventoryLabel('low', 2, 'es')).toBe('Quedan 2');
    expect(getInventoryLabel('sold_out', 0, 'en')).toBe('Sold out');
    expect(getInventoryLabel('available', 10, 'es')).toBe('Disponible');
  });
});
