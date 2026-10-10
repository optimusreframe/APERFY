import type { ImportPreview } from '@/lib/inventory-import/types';

export function isImportButtonDisabled(preview: ImportPreview | null, archiveReady: boolean, lookupReady = true): boolean {
  return !lookupReady || !archiveReady || !preview?.canImport;
}

export function getImportStockStatus(quantity: number | null): string {
  if (quantity === null) return 'Invalid stock';
  if (quantity === 0) return 'Sold out';
  if (quantity <= 3) return 'Low stock';
  return 'In stock';
}
