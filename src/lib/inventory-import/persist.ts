import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';
import type { Category } from '@/lib/model-types';
import type { ImportPreview, InventoryImportRow } from './types';

export type InventoryImportProgress = {
  completed: number;
  total: number;
  currentName: string;
  phase: 'image' | 'product';
};

export type InventoryImportFailure = {
  sourceRowNumber: number;
  name: string;
  message: string;
};

export type InventoryImportResult = {
  created: number;
  skipped: number;
  failed: number;
  uploadedPaths: string[];
  failures: InventoryImportFailure[];
};

type InventoryCategory = Pick<Category, 'id' | 'slug'>;
type ProgressCallback = (progress: InventoryImportProgress) => void | boolean;

function imageExtension(fileName: string): { extension: string; contentType: string } | null {
  const extension = fileName.split('.').pop()?.toLowerCase();
  const contentTypeByExtension: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  return extension && contentTypeByExtension[extension]
    ? { extension, contentType: contentTypeByExtension[extension] }
    : null;
}

function hasImageSignature(bytes: Uint8Array, extension: string): boolean {
  if (extension === 'jpg' || extension === 'jpeg') {
    return bytes.length >= 4
      && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
  }
  if (extension === 'png') {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const end = [0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82];
    return bytes.length >= 33
      && signature.every((value, index) => bytes[index] === value)
      && end.every((value, index) => bytes[bytes.length - end.length + index] === value);
  }
  if (extension === 'webp') {
    const riff = [0x52, 0x49, 0x46, 0x46].every((value, index) => bytes[index] === value);
    const webp = [0x57, 0x45, 0x42, 0x50].every((value, index) => bytes[index + 8] === value);
    const declaredSize = bytes.length >= 8
      ? new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true) + 8
      : Number.POSITIVE_INFINITY;
    return bytes.length >= 16 && riff && webp && declaredSize <= bytes.length;
  }
  return false;
}

function getPhotoEntry(zip: JSZip, fileName: string): JSZip.JSZipObject | null {
  const normalized = fileName.replaceAll('\\', '/');
  return Object.values(zip.files).find((entry) => {
    if (entry.dir) return false;
    const entryName = entry.name.replaceAll('\\', '/');
    return entryName === normalized || entryName.endsWith(`/${normalized}`);
  }) ?? null;
}

function isAlreadyExistsError(error: unknown): boolean {
  const candidate = error as { statusCode?: number; message?: string } | null;
  return candidate?.statusCode === 409 || /already exists|duplicate|resource exists/i.test(candidate?.message ?? '');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : (error as { message?: string } | null)?.message || 'Unknown import error';
}

function reportProgress(onProgress: ProgressCallback, progress: InventoryImportProgress): boolean {
  return onProgress(progress) !== false;
}

export async function persistInventoryImport(
  preview: ImportPreview,
  files: JSZip,
  categories: InventoryCategory[],
  onProgress: ProgressCallback = () => undefined,
): Promise<InventoryImportResult> {
  if (!preview.canImport) throw new Error('No se puede importar una vista previa con filas inválidas.');

  const result: InventoryImportResult = { created: 0, skipped: 0, failed: 0, uploadedPaths: [], failures: [] };
  let cancelled = false;

  for (const [index, row] of preview.rows.entries()) {
    if (cancelled) break;
    if (!reportProgress(onProgress, { completed: index, total: preview.rows.length, currentName: row.name, phase: 'image' })) break;

    let uploadedPath: string | null = null;
    let preserveUploadedPath = false;
    try {
      const { data: existing, error: lookupError } = await supabase
        .from('products')
        .select('id')
        .eq('inventory_source_key', row.sourceKey)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (existing) {
        result.skipped += 1;
        continue;
      }

      const category = categories.find((candidate) => candidate.slug === row.categorySlug);
      if (!category) throw new Error(`No existe una categoría activa para ${row.categorySlug}.`);

      const photo = getPhotoEntry(files, row.photoFileName);
      const image = imageExtension(row.photoFileName);
      if (!photo || !image) throw new Error(`No se encontró una imagen compatible para ${row.name}.`);
      const imageBytes = await photo.async('uint8array');
      if (!hasImageSignature(imageBytes, image.extension)) throw new Error(`El archivo ${row.photoFileName} no contiene una imagen válida.`);
      const blob = new Blob([imageBytes], { type: image.contentType });
      const path = `inventory-import/${row.sourceRowNumber}-${row.slug}.${image.extension}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(path, blob, {
        contentType: image.contentType,
        upsert: false,
      });
      if (uploadError && !isAlreadyExistsError(uploadError)) throw uploadError;
      if (!uploadError) {
        uploadedPath = path;
        result.uploadedPaths.push(path);
      }

      if (!reportProgress(onProgress, { completed: index, total: preview.rows.length, currentName: row.name, phase: 'product' })) {
        if (uploadedPath) await supabase.storage.from('product-images').remove([uploadedPath]);
        result.uploadedPaths = result.uploadedPaths.filter((candidate) => candidate !== uploadedPath);
        cancelled = true;
        break;
      }

      const { data: publicUrl } = supabase.storage.from('product-images').getPublicUrl(path);
      const productPayload = {
        name_en: row.name,
        name_es: row.name,
        description_en: row.description,
        description_es: row.description,
        slug: row.slug,
        base_price: row.unitPrice ?? 0,
        category_id: category.id,
        is_active: true,
        is_featured: false,
        images: [publicUrl.publicUrl],
        inventory_enabled: true,
        stock_quantity: row.quantity ?? 0,
        low_stock_threshold: 3,
        inventory_source_key: row.sourceKey,
      };
      const { error: insertError } = await supabase.from('products').insert(productPayload);
      if (insertError) {
        const { data: committed, error: reconciliationError } = await supabase
          .from('products')
          .select('id')
          .eq('inventory_source_key', row.sourceKey)
          .maybeSingle();
        if (committed) {
          result.skipped += 1;
          uploadedPath = null;
          continue;
        }
        if (reconciliationError) preserveUploadedPath = true;
        throw insertError;
      }
      result.created += 1;
      reportProgress(onProgress, { completed: index + 1, total: preview.rows.length, currentName: row.name, phase: 'product' });
    } catch (error) {
      if (uploadedPath && !preserveUploadedPath) {
        await supabase.storage.from('product-images').remove([uploadedPath]);
        result.uploadedPaths = result.uploadedPaths.filter((candidate) => candidate !== uploadedPath);
      }
      result.failed += 1;
      result.failures.push({ sourceRowNumber: row.sourceRowNumber, name: row.name, message: errorMessage(error) });
    }
  }

  return result;
}
