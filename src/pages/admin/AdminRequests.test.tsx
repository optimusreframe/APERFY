import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, vi } from 'vitest';
import AdminRequests from './AdminRequests';

const state = vi.hoisted(() => ({
  requests: [] as Array<Record<string, unknown>>,
  updates: [] as Array<{ payload: Record<string, unknown>; id: string }>,
}));

vi.mock('@/integrations/supabase/client', () => {
  const createQuery = () => {
    let mode: 'select' | 'update' = 'select';
    let payload: Record<string, unknown> = {};
    const filters: Record<string, unknown> = {};
    const query = {
      select: () => query,
      order: () => query,
      eq: (column: string, value: unknown) => { filters[column] = value; return query; },
      is: (column: string, value: unknown) => { filters[column] = value; return query; },
      not: (column: string, _operator: string, value: unknown) => { filters[`not:${column}`] = value; return query; },
      update: (next: Record<string, unknown>) => { mode = 'update'; payload = next; return query; },
      then: (resolve: (result: { data: unknown; error: null }) => unknown, reject?: (error: unknown) => unknown) => {
        if (mode === 'update') {
          const id = String(filters.id || '');
          state.updates.push({ payload, id });
          const row = state.requests.find((item) => item.id === id);
          if (row) Object.assign(row, payload);
          return Promise.resolve({ data: null, error: null }).then(resolve, reject);
        }
        let rows = state.requests;
        if (Object.prototype.hasOwnProperty.call(filters, 'archived_at')) rows = rows.filter((row) => row.archived_at === filters.archived_at);
        if (Object.prototype.hasOwnProperty.call(filters, 'not:archived_at')) rows = rows.filter((row) => Boolean(row.archived_at));
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
      },
    };
    return query;
  };

  return {
    supabase: {
      from: () => createQuery(),
      auth: { getUser: async () => ({ data: { user: { id: 'admin-1' } }, error: null }) },
    },
  };
});

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: { admin: { requests: {
      title: 'Model requests', empty: 'No requests', customer: 'Customer', product: 'Product', status: 'Status', date: 'Date', actions: 'Actions',
      statuses: { pending: 'Pending', reviewing: 'Reviewing', fulfilled: 'Fulfilled', rejected: 'Rejected' },
      viewDetails: 'View details', detailsTitle: 'Request details', contactInfo: 'Contact', notes: 'Notes', referenceUrl: 'Reference URL',
      referenceImages: 'Reference images', updateStatus: 'Update status', reject: 'Reject', fulfillConfirm: 'Fulfill this request',
      selectProduct: 'Select product', fulfill: 'Fulfill',
    } } },
  }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

function renderRequests() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><AdminRequests /></QueryClientProvider>);
}

describe('AdminRequests', () => {
  beforeEach(() => {
    state.requests = [
      { id: 'request-1', name: 'Ada', email: 'ada@example.com', phone: '5551234', product_name: 'Desk lamp', description: null, reference_url: null, images: [], status: 'pending', fulfilled_product_id: null, created_at: '2026-10-01T12:00:00.000Z', updated_at: '2026-10-01T12:00:00.000Z', archived_at: null },
      { id: 'request-2', name: 'Grace', email: 'grace@example.com', phone: '5554567', product_name: 'Desk clock', description: null, reference_url: null, images: [], status: 'pending', fulfilled_product_id: null, created_at: '2026-10-02T12:00:00.000Z', updated_at: '2026-10-02T12:00:00.000Z', archived_at: '2026-10-03T12:00:00.000Z' },
    ];
    state.updates = [];
  });

  it('confirms request archiving and restores archived requests', async () => {
    renderRequests();

    fireEvent.click(await screen.findByRole('button', { name: /archive request request-1/i }));
    expect(state.updates).toHaveLength(0);
    expect(await screen.findByText(/move this request to the archive/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^archive request$/i }));
    await waitFor(() => expect(state.updates).toContainEqual(expect.objectContaining({
      id: 'request-1', payload: expect.objectContaining({ archived_at: expect.any(String), archived_by: 'admin-1' }),
    })));

    fireEvent.click(screen.getByRole('button', { name: /archived/i }));
    expect(await screen.findByText('Desk clock')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /restore request request-2/i }));
    await waitFor(() => expect(state.updates).toContainEqual({ id: 'request-2', payload: { archived_at: null, archived_by: null } }));
  });
});
