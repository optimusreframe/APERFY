import { normalizeInventoryPath } from './paths';

export const INVENTORY_IMPORT_LIMITS = Object.freeze({
  maxArchiveBytes: 250 * 1024 * 1024,
  maxArchiveEntries: 512,
  maxWorkbookBytes: 20 * 1024 * 1024,
  maxRows: 5_000,
  maxImageBytes: 25 * 1024 * 1024,
});

export type InventoryArchiveLimitsInput = {
  archiveBytes?: number;
  entryCount?: number;
  workbookBytes?: number;
  rowCount?: number;
};

function assertLimit(label: string, actual: number | undefined, maximum: number): void {
  if (actual === undefined) return;
  if (!Number.isFinite(actual) || actual < 0) throw new Error(`${label} no es válido.`);
  if (actual > maximum) throw new Error(`${label} supera el límite permitido de ${maximum.toLocaleString('es-ES')}.`);
}

export function validateInventoryArchiveLimits(input: InventoryArchiveLimitsInput): void {
  assertLimit('El tamaño del ZIP', input.archiveBytes, INVENTORY_IMPORT_LIMITS.maxArchiveBytes);
  assertLimit('El número de archivos del ZIP', input.entryCount, INVENTORY_IMPORT_LIMITS.maxArchiveEntries);
  assertLimit('El tamaño del workbook', input.workbookBytes, INVENTORY_IMPORT_LIMITS.maxWorkbookBytes);
  assertLimit('El número de filas', input.rowCount, INVENTORY_IMPORT_LIMITS.maxRows);
}

export function assertSafeArchiveEntryName(name: string): void {
  const normalizedName = normalizeInventoryPath(name);
  if (
    normalizedName.startsWith('/')
    || /^[A-Za-z]:\//.test(normalizedName)
    || normalizedName.split('/').includes('..')
  ) {
    throw new Error(`El ZIP contiene una ruta no segura: ${name}`);
  }
}

export function assertSafeImageSize(byteLength: number): void {
  assertLimit('El tamaño de la imagen', byteLength, INVENTORY_IMPORT_LIMITS.maxImageBytes);
}
