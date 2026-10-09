import { describe, expect, it } from 'vitest';
import {
  assertSafeArchiveEntryName,
  assertSafeImageSize,
  INVENTORY_IMPORT_LIMITS,
  validateInventoryArchiveLimits,
} from './safety';

describe('inventory import safety limits', () => {
  it('accepts the expected inventory archive shape', () => {
    expect(() => validateInventoryArchiveLimits({
      archiveBytes: 50 * 1024 * 1024,
      entryCount: 210,
      workbookBytes: 2 * 1024 * 1024,
      rowCount: 209,
    })).not.toThrow();
  });

  it('rejects oversized archives, workbooks and row sets', () => {
    expect(() => validateInventoryArchiveLimits({ archiveBytes: INVENTORY_IMPORT_LIMITS.maxArchiveBytes + 1 }))
      .toThrow('tamaño del ZIP');
    expect(() => validateInventoryArchiveLimits({ workbookBytes: INVENTORY_IMPORT_LIMITS.maxWorkbookBytes + 1 }))
      .toThrow('tamaño del workbook');
    expect(() => validateInventoryArchiveLimits({ rowCount: INVENTORY_IMPORT_LIMITS.maxRows + 1 }))
      .toThrow('número de filas');
  });

  it('rejects zip-slip paths and oversized decompressed images', () => {
    expect(() => assertSafeArchiveEntryName('../outside.jpg')).toThrow('ruta no segura');
    expect(() => assertSafeArchiveEntryName('/outside.jpg')).toThrow('ruta no segura');
    expect(() => assertSafeImageSize(INVENTORY_IMPORT_LIMITS.maxImageBytes + 1)).toThrow('tamaño de la imagen');
  });
});
