import { classifyInventoryRow, normalizeInventoryText } from './classify';
import { inferProductCondition } from '../product-condition';
import { normalizeInventoryPath } from './paths';
import type { ExistingInventoryProduct, ImportPreview, InventoryCellValue, InventoryImportRow, InventorySourceRow } from './types';

function asText(value: InventoryCellValue): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function asNumber(value: InventoryCellValue): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Number(value.replace(/[$,]/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePhotoName(value: InventoryCellValue): string {
  return normalizeInventoryPath(asText(value)).split('/').pop() || '';
}

function hasPhoto(photoFileName: string, photoNames: Set<string>): boolean {
  if (!photoFileName) return false;
  if (photoNames.has(photoFileName)) return true;
  return Array.from(photoNames).some((name) => normalizeInventoryPath(name).endsWith(`/${photoFileName}`));
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function createUniqueInventorySlug(name: string, sourceRowNumber: number, usedSlugs: Set<string>): string {
  const base = slugify(name) || `inventory-item-${sourceRowNumber}`;
  let candidate = base;
  let suffix = 0;
  while (usedSlugs.has(candidate)) {
    suffix += 1;
    candidate = suffix === 1
      ? `${base}-inventory-${sourceRowNumber}`
      : `${base}-inventory-${sourceRowNumber}-${suffix}`;
  }
  usedSlugs.add(candidate);
  return candidate;
}

export function buildImportPreview(
  rows: InventorySourceRow[],
  photoNames: Set<string>,
  existingProducts: Set<string> | ExistingInventoryProduct[],
): ImportPreview {
  const existingSlugs = existingProducts instanceof Set
    ? existingProducts
    : new Set(existingProducts.map((product) => product.slug));
  const existingSourceKeys = existingProducts instanceof Set
    ? new Set<string>()
    : new Set(existingProducts.map((product) => product.inventory_source_key).filter((key): key is string => Boolean(key)));
  const usedSlugs = new Set<string>();
  const categoryCounts: Record<string, number> = {};
  const missingFields: Record<string, number> = {};
  const nameRows = new Map<string, number[]>();
  const fallbackRows: number[] = [];
  const slugConflicts: Array<{ slug: string; rowNumber: number }> = [];
  const importRows: InventoryImportRow[] = rows.map((source, index) => {
    const sourceRowNumber = index + 2;
    const name = asText(source.Item);
    const brand = asText(source.Brand);
    const model = asText(source.Model);
    const description = asText(source.Description);
    const quantity = asNumber(source.Qty);
    const unitPrice = asNumber(source['Unit price']);
    const currency = asText(source.Currency).toUpperCase();
    const status = asText(source.Status).toLowerCase();
    const conditionStatus = inferProductCondition(source);
    const photoFileName = normalizePhotoName(source['Photo file']);
    const categorySource = asText(source.Category);
    const classified = classifyInventoryRow(source);
    const slug = createUniqueInventorySlug(name, sourceRowNumber, usedSlugs);
    const sourceKey = `inventory:inventory.xlsx:${sourceRowNumber}:${photoFileName}`;
    const issues: string[] = [];

    if (!name) issues.push('missing_name');
    if (!description) issues.push('missing_description');
    if (quantity === null || quantity < 0 || !Number.isInteger(quantity)) issues.push('invalid_quantity');
    if (unitPrice === null || unitPrice < 0) issues.push('invalid_price');
    if (currency !== 'USD') issues.push('invalid_currency');
    if (status !== 'approved') issues.push('not_approved');
    if (!categorySource) issues.push('missing_category');
    if (!photoFileName || !hasPhoto(photoFileName, photoNames)) issues.push('missing_photo');
    if (existingSlugs.has(slug) && !existingSourceKeys.has(sourceKey)) {
      issues.push('existing_slug_conflict');
      slugConflicts.push({ slug, rowNumber: sourceRowNumber });
    }

    const missingKeys = issues.filter((issue) => issue.startsWith('missing_'));
    missingKeys.forEach((issue) => { missingFields[issue] = (missingFields[issue] || 0) + 1; });
    categoryCounts[classified.slug] = (categoryCounts[classified.slug] || 0) + 1;
    if (!nameRows.has(normalizeInventoryText(name))) nameRows.set(normalizeInventoryText(name), []);
    nameRows.get(normalizeInventoryText(name))!.push(sourceRowNumber);
    const isFallback = classified.reason.includes('fallback');
    if (isFallback) fallbackRows.push(sourceRowNumber);

    return {
      sourceRowNumber,
      sourceKey,
      source,
      name,
      brand,
      model,
      description,
      quantity,
      unitPrice,
      currency,
      status,
      conditionStatus,
      photoFileName,
      categorySource,
      categorySlug: classified.slug,
      categoryReason: classified.reason,
      isFallback,
      slug,
      issues,
    };
  });

  const duplicateNames = Array.from(nameRows.entries())
    .filter(([name, rowNumbers]) => name && rowNumbers.length > 1)
    .map(([name, rowNumbers]) => ({ name, count: rowNumbers.length, rowNumbers }));
  const totalReferencedPhotos = importRows.filter((row) => row.photoFileName).length;
  const canImport = importRows.length > 0 && importRows.every((row) => row.issues.length === 0);

  return {
    rows: importRows,
    totalRows: importRows.length,
    totalPhotos: photoNames.size,
    totalReferencedPhotos,
    totalQuantity: importRows.reduce((sum, row) => sum + (row.quantity ?? 0), 0),
    categoryCounts,
    missingFields,
    duplicateNames,
    fallbackRows,
    slugConflicts,
    canImport,
  };
}
