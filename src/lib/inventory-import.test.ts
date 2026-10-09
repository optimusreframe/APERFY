import JSZip from 'jszip';
import { describe, expect, it, vi } from 'vitest';
import { classifyInventoryRow } from './inventory-import/classify';
import { buildImportPreview, createUniqueInventorySlug } from './inventory-import/preview';
import { persistInventoryImport } from './inventory-import/persist';
import type { InventorySourceRow } from './inventory-import/types';

const supabaseState = vi.hoisted(() => ({
  existingSourceKeys: new Set<string>(),
  inserted: [] as Record<string, unknown>[],
  uploaded: new Set<string>(),
  removed: [] as string[][],
  insertError: null as { message: string } | null,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table !== 'products') throw new Error(`Unexpected table: ${table}`);
      return {
        select: () => ({
          eq: (_column: string, sourceKey: string) => ({
            maybeSingle: async () => ({
              data: supabaseState.existingSourceKeys.has(sourceKey) ? { id: 'existing-product' } : null,
              error: null,
            }),
          }),
        }),
        insert: async (payload: Record<string, unknown>) => {
          supabaseState.inserted.push(payload);
          return { error: supabaseState.insertError };
        },
      };
    },
    storage: {
      from: () => ({
        upload: async (path: string) => {
          if (supabaseState.uploaded.has(path)) return { error: { statusCode: 409, message: 'The resource already exists' } };
          supabaseState.uploaded.add(path);
          return { error: null };
        },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.test/${path}` } }),
        remove: async (paths: string[]) => { supabaseState.removed.push(paths); return { error: null }; },
      }),
    },
  },
}));

const row = (overrides: Partial<InventorySourceRow> = {}): InventorySourceRow => ({
  Item: 'USB-C charging cable', Brand: 'Example', Model: 'C100', Category: 'Electronics',
  Qty: 4, Unit: 'EA', Status: 'approved', 'AI %': 100, 'Unit price': 12.5,
  'Total value': 50, Currency: 'USD', Department: 'IT', Location: 'Shelf A',
  Created: '2026-10-08', Description: 'Braided cable', 'Photo file': 'cable.jpg', ...overrides,
});

function resetSupabaseState() {
  supabaseState.existingSourceKeys.clear();
  supabaseState.inserted.length = 0;
  supabaseState.uploaded.clear();
  supabaseState.removed.length = 0;
  supabaseState.insertError = null;
}

async function archiveWithPhoto() {
  const zip = new JSZip();
  zip.file('cable.jpg', new Uint8Array([0xff, 0xd8, 0xff]));
  return zip;
}

describe('inventory taxonomy', () => {
  it('uses the most specific shopper category', () => {
    expect(classifyInventoryRow(row({ Item: 'iPhone 15 MagSafe case' })).slug)
      .toBe('cell-phones-accessories');
    expect(classifyInventoryRow(row({ Item: 'PLA filament 1.75mm' })).slug)
      .toBe('3d-printing');
    expect(classifyInventoryRow(row({ Item: 'Generic USB cable' })).slug)
      .toBe('electronics');
  });

  it('reports missing photo and category fallback in the preview', () => {
    const preview = buildImportPreview(
      [row({ Item: 'Generic item', Category: 'Miscellaneous', 'Photo file': 'missing.jpg' })],
      new Set(),
      new Set(),
    );
    expect(preview.rows[0].issues).toContain('missing_photo');
    expect(preview.rows[0].categoryReason).toContain('Electronics');
    expect(preview.canImport).toBe(false);
  });

  it('keeps repeated names as deterministic unique slugs', () => {
    const used = new Set<string>();
    expect(createUniqueInventorySlug('Desk Lamp', 2, used)).toBe('desk-lamp');
    expect(createUniqueInventorySlug('Desk Lamp', 3, used)).toBe('desk-lamp-inventory-3');
  });

  it('keeps probing when the base and first suffix are already used', () => {
    const used = new Set(['desk-lamp', 'desk-lamp-inventory-3']);
    expect(createUniqueInventorySlug('Desk Lamp', 3, used)).toBe('desk-lamp-inventory-3-2');
  });

  it('blocks invalid quantity, price, currency, status and existing slugs', () => {
    const preview = buildImportPreview(
      [row({ Qty: 1.5, 'Unit price': -1, Currency: 'CAD', Status: 'pending', 'Photo file': 'cable.jpg' })],
      new Set(['cable.jpg']),
      new Set(['usb-c-charging-cable']),
    );
    expect(preview.rows[0].issues).toEqual(expect.arrayContaining([
      'invalid_quantity', 'invalid_price', 'invalid_currency', 'not_approved', 'existing_slug_conflict',
    ]));
    expect(preview.slugConflicts).toHaveLength(1);
    expect(preview.canImport).toBe(false);
  });

  it('creates a product with inventory fields and source key', async () => {
    resetSupabaseState();
    const preview = buildImportPreview([row()], new Set(['cable.jpg']), new Set());
    const result = await persistInventoryImport(preview, await archiveWithPhoto(), [{ id: 'cat-electronics', slug: 'electronics' }], () => undefined);

    expect(result).toMatchObject({ created: 1, skipped: 0, failed: 0 });
    expect(supabaseState.inserted[0]).toMatchObject({
      base_price: 12.5,
      stock_quantity: 4,
      inventory_enabled: true,
      low_stock_threshold: 3,
      is_active: true,
      category_id: 'cat-electronics',
      images: ['https://storage.test/inventory-import/2-usb-c-charging-cable.jpg'],
      inventory_source_key: 'inventory:inventory.xlsx:2:cable.jpg',
    });
    expect(result.uploadedPaths).toEqual(['inventory-import/2-usb-c-charging-cable.jpg']);
  });

  it('skips an existing source key without inserting or uploading', async () => {
    resetSupabaseState();
    supabaseState.existingSourceKeys.add('inventory:inventory.xlsx:2:cable.jpg');
    const preview = buildImportPreview([row()], new Set(['cable.jpg']), new Set());
    const result = await persistInventoryImport(preview, await archiveWithPhoto(), [{ id: 'cat-electronics', slug: 'electronics' }]);

    expect(result).toMatchObject({ created: 0, skipped: 1, failed: 0 });
    expect(supabaseState.inserted).toHaveLength(0);
    expect(supabaseState.uploaded.size).toBe(0);
  });

  it('resumes an existing storage object without deleting it', async () => {
    resetSupabaseState();
    supabaseState.uploaded.add('inventory-import/2-usb-c-charging-cable.jpg');
    const preview = buildImportPreview([row()], new Set(['cable.jpg']), new Set());
    const result = await persistInventoryImport(preview, await archiveWithPhoto(), [{ id: 'cat-electronics', slug: 'electronics' }]);

    expect(result).toMatchObject({ created: 1, skipped: 0, failed: 0, uploadedPaths: [] });
    expect(supabaseState.removed).toHaveLength(0);
  });

  it('removes only the newly uploaded image when product insert fails', async () => {
    resetSupabaseState();
    supabaseState.insertError = { message: 'insert failed' };
    const preview = buildImportPreview([row()], new Set(['cable.jpg']), new Set());
    const result = await persistInventoryImport(preview, await archiveWithPhoto(), [{ id: 'cat-electronics', slug: 'electronics' }]);

    expect(result).toMatchObject({ created: 0, skipped: 0, failed: 1 });
    expect(result.failures).toEqual([{ sourceRowNumber: 2, name: 'USB-C charging cable', message: 'insert failed' }]);
    expect(supabaseState.removed).toEqual([['inventory-import/2-usb-c-charging-cable.jpg']]);
  });
});
