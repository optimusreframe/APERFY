import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { describe, expect, it, vi } from 'vitest';
import AdminInventoryImport, { isImportButtonDisabled } from './AdminInventoryImport';
import { loadInventoryImportParsers } from '@/lib/inventory-import/parsers';
import type { ImportPreview } from '@/lib/inventory-import/types';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => table === 'products'
      ? { select: async () => ({ data: [{ slug: 'phone' }], error: null }) }
      : { select: () => ({ eq: async () => ({ data: [{ id: 'cat-electronics', slug: 'electronics' }], error: null }) }) },
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const preview = (canImport: boolean): ImportPreview => ({
  rows: [], totalRows: 1, totalPhotos: 1, totalReferencedPhotos: 1, totalQuantity: 1,
  categoryCounts: {}, missingFields: {}, duplicateNames: [], fallbackRows: [], slugConflicts: [], canImport,
});

describe('AdminInventoryImport', () => {
  it('loads archive parsers through the lazy runtime boundary', async () => {
    const parsers = await loadInventoryImportParsers();

    expect(typeof parsers.JSZip.loadAsync).toBe('function');
    expect(typeof parsers.XLSX.read).toBe('function');
  });

  it('blocks import until the archive is loaded and the preview is valid', () => {
    expect(isImportButtonDisabled(null, false)).toBe(true);
    expect(isImportButtonDisabled(preview(false), true)).toBe(true);
    expect(isImportButtonDisabled(preview(true), false)).toBe(true);
    expect(isImportButtonDisabled(preview(true), true, false)).toBe(true);
    expect(isImportButtonDisabled(preview(true), true)).toBe(false);
  });

  it('renders invalid preview totals and concrete slug conflict while disabling import', async () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Item', 'Brand', 'Model', 'Category', 'Qty', 'Status', 'Unit price', 'Currency', 'Description', 'Photo file'],
      ['Phone', 'Acme', 'P1', 'Electronics', 2, 'approved', 19.99, 'USD', '', 'phone.jpg'],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
    const zip = new JSZip();
    zip.file('inventory.xlsx', XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));
    zip.file('phone.jpg', new Uint8Array([1, 2, 3]));
    const file = new File([await zip.generateAsync({ type: 'uint8array' })], 'inventory.zip', { type: 'application/zip' });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminInventoryImport />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const archiveInput = screen.getByLabelText('Choose ZIP');
    await waitFor(() => expect(archiveInput).not.toBeDisabled());
    fireEvent.change(archiveInput, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText('1 ROWS NEED REVIEW')).toBeInTheDocument());
    expect(screen.getByText('1/1')).toBeInTheDocument();
    expect(screen.getByText(/phone \(row 2\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Import products/i })).toBeDisabled();
  });
});
