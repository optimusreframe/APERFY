import { describe, expect, it } from 'vitest';
import { isImportButtonDisabled } from './AdminInventoryImport';
import type { ImportPreview } from '@/lib/inventory-import/types';

const preview = (canImport: boolean): ImportPreview => ({
  rows: [], totalRows: 1, totalPhotos: 1, totalReferencedPhotos: 1, totalQuantity: 1,
  categoryCounts: {}, missingFields: {}, duplicateNames: [], fallbackRows: [], slugConflicts: [], canImport,
});

describe('AdminInventoryImport', () => {
  it('blocks import until the archive is loaded and the preview is valid', () => {
    expect(isImportButtonDisabled(null, false)).toBe(true);
    expect(isImportButtonDisabled(preview(false), true)).toBe(true);
    expect(isImportButtonDisabled(preview(true), false)).toBe(true);
    expect(isImportButtonDisabled(preview(true), true)).toBe(false);
  });
});
