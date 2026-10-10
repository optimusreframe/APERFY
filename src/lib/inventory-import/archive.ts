import { buildImportPreview } from './preview';
import { assertSafeArchiveEntryName, validateInventoryArchiveLimits } from './safety';
import { loadInventoryImportParsers, type InventoryZipArchive } from './parsers';
import type { ExistingInventoryProduct, ImportPreview, InventorySourceRow } from './types';

export interface ParsedInventoryArchive {
  zip: InventoryZipArchive;
  preview: ImportPreview;
}

function isImagePath(path: string): boolean {
  return /\.(?:jpe?g|png|webp)$/i.test(path) && !path.endsWith('/');
}

export async function parseInventoryArchive(file: File, existingProducts: ExistingInventoryProduct[]): Promise<ParsedInventoryArchive> {
  const { JSZip, XLSX } = await loadInventoryImportParsers();
  validateInventoryArchiveLimits({ archiveBytes: file.size });
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files);
  validateInventoryArchiveLimits({ entryCount: entries.length });
  entries.forEach((entry) => assertSafeArchiveEntryName(entry.unsafeOriginalName ?? entry.name));
  const workbookEntries = entries.filter((entry) => !entry.dir && /(?:^|\/)inventory\.xlsx$/i.test(entry.name));
  if (workbookEntries.length !== 1) {
    if (workbookEntries.length === 0) throw new Error('El ZIP debe contener exactamente un archivo inventory.xlsx.');
    throw new Error(`El ZIP debe contener exactamente un archivo inventory.xlsx; encontrados: ${workbookEntries.map((entry) => entry.name).join(', ')}`);
  }
  const workbookEntry = workbookEntries[0];

  const workbookBuffer = await workbookEntry.async('arraybuffer');
  validateInventoryArchiveLimits({ workbookBytes: workbookBuffer.byteLength });
  const workbook = XLSX.read(workbookBuffer, { type: 'array', cellDates: false });
  const worksheet = workbook.Sheets.Inventory;
  if (!worksheet) throw new Error(`No se encontró la hoja Inventory en el workbook. Hojas disponibles: ${workbook.SheetNames.join(', ') || 'ninguna'}.`);

  const rows = XLSX.utils.sheet_to_json<InventorySourceRow>(worksheet, { defval: null, raw: true });
  validateInventoryArchiveLimits({ rowCount: rows.length });
  if (rows.length === 0) throw new Error('La hoja Inventory no contiene filas de productos.');

  const photoNames = new Set(entries.filter((entry) => isImagePath(entry.name)).map((entry) => entry.name));
  return { zip, preview: buildImportPreview(rows, photoNames, existingProducts) };
}
