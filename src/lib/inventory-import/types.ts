export type InventoryCellValue = string | number | boolean | Date | null | undefined;

export interface InventorySourceRow {
  Item?: InventoryCellValue;
  Brand?: InventoryCellValue;
  Model?: InventoryCellValue;
  Category?: InventoryCellValue;
  Qty?: InventoryCellValue;
  Unit?: InventoryCellValue;
  Status?: InventoryCellValue;
  Condition?: InventoryCellValue;
  'AI %'?: InventoryCellValue;
  'Unit price'?: InventoryCellValue;
  'Total value'?: InventoryCellValue;
  Currency?: InventoryCellValue;
  Department?: InventoryCellValue;
  Location?: InventoryCellValue;
  Created?: InventoryCellValue;
  Description?: InventoryCellValue;
  'Photo file'?: InventoryCellValue;
  [key: string]: InventoryCellValue;
}

export interface InventoryImportRow {
  sourceRowNumber: number;
  sourceKey: string;
  source: InventorySourceRow;
  name: string;
  brand: string;
  model: string;
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  currency: string;
  status: string;
  conditionStatus: 'new' | 'used';
  photoFileName: string;
  categorySource: string;
  categorySlug: string;
  categoryReason: string;
  isFallback: boolean;
  slug: string;
  issues: string[];
}

export interface ExistingInventoryProduct {
  slug: string;
  inventory_source_key: string | null;
}

export interface ImportPreview {
  rows: InventoryImportRow[];
  totalRows: number;
  totalPhotos: number;
  totalReferencedPhotos: number;
  totalQuantity: number;
  categoryCounts: Record<string, number>;
  missingFields: Record<string, number>;
  duplicateNames: Array<{ name: string; count: number; rowNumbers: number[] }>;
  fallbackRows: number[];
  slugConflicts: Array<{ slug: string; rowNumber: number }>;
  canImport: boolean;
}
