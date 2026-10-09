import { describe, expect, it } from 'vitest';
import { classifyInventoryRow } from './inventory-import/classify';
import { buildImportPreview, createUniqueInventorySlug } from './inventory-import/preview';
import type { InventorySourceRow } from './inventory-import/types';

const row = (overrides: Partial<InventorySourceRow> = {}): InventorySourceRow => ({
  Item: 'USB-C charging cable', Brand: 'Example', Model: 'C100', Category: 'Electronics',
  Qty: 4, Unit: 'EA', Status: 'approved', 'AI %': 100, 'Unit price': 12.5,
  'Total value': 50, Currency: 'USD', Department: 'IT', Location: 'Shelf A',
  Created: '2026-10-08', Description: 'Braided cable', 'Photo file': 'cable.jpg', ...overrides,
});

describe('inventory taxonomy', () => {
  it('uses the most specific shopper category', () => {
    expect(classifyInventoryRow(row({ Item: 'iPhone 15 MagSafe case' })).slug)
      .toBe('cell-phones-accessories');
    expect(classifyInventoryRow(row({ Item: 'PLA filament 1.75mm' })).slug)
      .toBe('3d-printing');
    expect(classifyInventoryRow(row({ Item: 'Generic USB cable' })).slug)
      .toBe('electronics');
  });

  it('reports missing photo and category fallback in the preview', () => {
    const preview = buildImportPreview(
      [row({ Item: 'Generic item', Category: 'Miscellaneous', 'Photo file': 'missing.jpg' })],
      new Set(),
      new Set(),
    );
    expect(preview.rows[0].issues).toContain('missing_photo');
    expect(preview.rows[0].categoryReason).toContain('Electronics');
    expect(preview.canImport).toBe(false);
  });

  it('keeps repeated names as deterministic unique slugs', () => {
    const used = new Set<string>();
    expect(createUniqueInventorySlug('Desk Lamp', 2, used)).toBe('desk-lamp');
    expect(createUniqueInventorySlug('Desk Lamp', 3, used)).toBe('desk-lamp-inventory-3');
  });

  it('blocks invalid quantity, price, currency, status and existing slugs', () => {
    const preview = buildImportPreview(
      [row({ Qty: 1.5, 'Unit price': -1, Currency: 'CAD', Status: 'pending', 'Photo file': 'cable.jpg' })],
      new Set(['cable.jpg']),
      new Set(['usb-c-charging-cable']),
    );
    expect(preview.rows[0].issues).toEqual(expect.arrayContaining([
      'invalid_quantity', 'invalid_price', 'invalid_currency', 'not_approved', 'existing_slug_conflict',
    ]));
    expect(preview.slugConflicts).toHaveLength(1);
    expect(preview.canImport).toBe(false);
  });
});
