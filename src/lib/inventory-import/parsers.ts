export interface InventoryZipEntry {
  name: string;
  unsafeOriginalName?: string;
  dir: boolean;
  async(type: 'arraybuffer'): Promise<ArrayBuffer>;
  async(type: 'uint8array'): Promise<Uint8Array>;
}

export interface InventoryZipArchive {
  files: Record<string, InventoryZipEntry>;
}

export type InventoryImportParsers = {
  JSZip: typeof import('jszip');
  XLSX: typeof import('xlsx');
};

export async function loadInventoryImportParsers(): Promise<InventoryImportParsers> {
  const [{ default: JSZip }, XLSX] = await Promise.all([
    import('jszip'),
    import('xlsx'),
  ]);
  return { JSZip, XLSX };
}
