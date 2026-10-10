import { describe, expect, it } from 'vitest';
import { getImportStockStatus, isImportButtonDisabled } from './inventoryImportHelpers';

const validPreview = { canImport: true } as Parameters<typeof isImportButtonDisabled>[0];

describe('inventory import helpers', () => {
  it('keeps import disabled until preview, archive, and lookup are ready', () => {
    expect(isImportButtonDisabled(null, false)).toBe(true);
    expect(isImportButtonDisabled(validPreview, false)).toBe(true);
    expect(isImportButtonDisabled(validPreview, true, false)).toBe(true);
    expect(isImportButtonDisabled(validPreview, true)).toBe(false);
  });

  it('maps imported quantities to the visible stock status', () => {
    expect(getImportStockStatus(null)).toBe('Invalid stock');
    expect(getImportStockStatus(0)).toBe('Sold out');
    expect(getImportStockStatus(2)).toBe('Low stock');
    expect(getImportStockStatus(4)).toBe('In stock');
  });
});
