import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, vi } from 'vitest';
import AdminOrders from './AdminOrders';

const state = vi.hoisted(() => ({
  orders: [] as Array<Record<string, unknown>>,
  orderItems: [] as Array<Record<string, unknown>>,
  updates: [] as Array<{ table: string; payload: Record<string, unknown>; id: string }>,
  uploads: [] as Array<{ path: string; file: File }>,
  rpcCalls: [] as Array<{ name: string; args: Record<string, unknown> }>,
  toast: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => {
  const createQuery = (table: string) => {
    let mode: 'select' | 'update' | 'insert' = 'select';
    let payload: Record<string, unknown> = {};
    const filters: Record<string, unknown> = {};
    const query = {
      select: () => query,
      order: () => query,
      limit: () => query,
      eq: (column: string, value: unknown) => { filters[column] = value; return query; },
      is: (column: string, value: unknown) => { filters[column] = value; return query; },
      not: (column: string, _operator: string, value: unknown) => { filters[`not:${column}`] = value; return query; },
      update: (next: Record<string, unknown>) => { mode = 'update'; payload = next; return query; },
      insert: (next: Record<string, unknown>) => { mode = 'insert'; payload = next; return query; },
      maybeSingle: async () => ({ data: null, error: null }),
      then: (resolve: (result: { data: unknown; error: null }) => unknown, reject?: (error: unknown) => unknown) => {
        if (mode === 'update') {
          const id = String(filters.id || '');
          state.updates.push({ table, payload, id });
          const rows = table === 'orders' ? state.orders : [];
          const row = rows.find((item) => item.id === id);
          if (row) Object.assign(row, payload);
          return Promise.resolve({ data: null, error: null }).then(resolve, reject);
        }

        let rows = table === 'orders' ? state.orders : table === 'order_items' ? state.orderItems : [];
        if (Object.prototype.hasOwnProperty.call(filters, 'archived_at')) {
          rows = rows.filter((row) => row.archived_at === filters.archived_at);
        }
        if (Object.prototype.hasOwnProperty.call(filters, 'not:archived_at')) {
          rows = rows.filter((row) => Boolean(row.archived_at));
        }
        if (filters.id) rows = rows.filter((row) => row.id === filters.id);
        if (filters.order_id) rows = rows.filter((row) => row.order_id === filters.order_id);
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
      },
    };
    return query;
  };

  return {
    supabase: {
      from: (table: string) => createQuery(table),
      auth: { getUser: async () => ({ data: { user: { id: 'admin-1' } }, error: null }) },
      rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
        state.rpcCalls.push({ name, args });
        return { data: 'event-1', error: null };
      }),
      storage: { from: () => ({
        upload: async (path: string, file: File) => {
          state.uploads.push({ path, file });
          return { data: { path }, error: null };
        },
        createSignedUrl: async () => ({ data: { signedUrl: 'https://private.example/signed-proof' }, error: null }),
      }) },
    },
  };
});

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: state.toast }) }));
vi.mock('@/lib/activity-log', () => ({ logActivity: vi.fn() }));
vi.mock('@/lib/send-email', () => ({ sendTransactionalEmail: vi.fn() }));

const createOrder = (id: string, archivedAt: string | null = null) => ({
  id,
  total: 42,
  status: 'pending',
  created_at: '2026-10-01T12:00:00.000Z',
  payment_method: 'zelle',
  payment_status: 'pending',
  payment_proof_path: null,
  archived_at: archivedAt,
  shipping_address: { full_name: `Customer ${id}` },
  user_id: 'customer-1',
  source: 'website',
  telegram_status: 'sent',
  notes: null,
});

function renderOrders() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><AdminOrders /></MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminOrders', () => {
  beforeAll(() => {
    Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  });

  beforeEach(() => {
    state.orders = [createOrder('active-1'), createOrder('archived-1', '2026-10-02T12:00:00.000Z')];
    state.orderItems = [];
    state.updates = [];
    state.uploads = [];
    state.rpcCalls = [];
    state.toast.mockClear();
    localStorage.clear();
  });

  it('requires confirmation before archiving and provides a restore action in the archive view', async () => {
    const { container } = renderOrders();

    const activeOrderTexts = await screen.findAllByText('#ACTIVE-1');
    const activeOrderRow = activeOrderTexts.find((element) => element.closest('tr'))?.closest('tr');
    expect(activeOrderRow).not.toBeNull();
    const archiveAction = within(activeOrderRow as HTMLElement).getByRole('button', { name: /archive order active-1/i });
    fireEvent.click(archiveAction);
    expect(state.updates).toHaveLength(0);
    expect(await screen.findByText(/move this order to the archive/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^archive order$/i }));
    await waitFor(() => expect(state.updates).toContainEqual(expect.objectContaining({
      table: 'orders',
      id: 'active-1',
      payload: expect.objectContaining({ archived_at: expect.any(String), archived_by: 'admin-1' }),
    })));

    fireEvent.click(screen.getByRole('button', { name: /archived/i }));
    const archivedOrderTexts = await screen.findAllByText('#ARCHIVED');
    const archivedRow = archivedOrderTexts.find((element) => element.closest('tr'))?.closest('tr');
    expect(archivedRow).not.toBeNull();
    fireEvent.click(within(archivedRow as HTMLElement).getByRole('button', { name: /restore order archived-1/i }));
    await waitFor(() => expect(state.updates).toContainEqual(expect.objectContaining({
      table: 'orders', id: 'archived-1', payload: { archived_at: null, archived_by: null },
    })));
    expect(container.querySelector('ul[aria-label="Orders card list"]')).toHaveClass('2xl:hidden');
  });

  it('provides a keyboard-accessible status control on Kanban cards', async () => {
    localStorage.setItem('admin-orders-view', 'kanban');
    renderOrders();

    const statusControl = await screen.findByRole('combobox', { name: /move order active-1/i });
    fireEvent.click(statusControl);
    fireEvent.click(await screen.findByRole('option', { name: /confirmed/i }));

    await waitFor(() => expect(state.updates).toContainEqual(expect.objectContaining({
      table: 'orders', id: 'active-1', payload: { status: 'confirmed' },
    })));
  });

  it('uploads a private proof and records received status through the audit function', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'proof-key' });
    const { container } = renderOrders();

    const cardList = await waitFor(() => {
      const element = container.querySelector('ul[aria-label="Orders card list"]');
      expect(element).not.toBeNull();
      return element as HTMLElement;
    });
    const detailsButton = await within(cardList).findByRole('button', { name: 'Show details for order active-1' });
    fireEvent.click(detailsButton);
    const fileInput = await within(cardList).findByLabelText('Upload payment proof for active-1');
    const file = new File(['payment proof'], 'receipt.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(state.uploads).toHaveLength(1));
    await waitFor(() => expect(state.rpcCalls).toContainEqual(expect.objectContaining({
      name: 'record_order_payment_event',
      args: expect.objectContaining({ p_order_id: 'active-1', p_event_type: 'proof_uploaded' }),
    })));
    expect(state.uploads[0].path).toMatch(/^active-1\/proof-/);

    fireEvent.click(within(cardList).getByRole('button', { name: /mark received/i }));
    await waitFor(() => expect(state.rpcCalls).toContainEqual(expect.objectContaining({
      name: 'record_order_payment_event',
      args: expect.objectContaining({ p_order_id: 'active-1', p_event_type: 'received' }),
    })));
  });

  it('shows narrow-screen order cards with labeled, touch-sized controls', async () => {
    const { container } = renderOrders();
    const cardList = await waitFor(() => {
      const element = container.querySelector('ul[aria-label="Orders card list"]');
      expect(element).not.toBeNull();
      return element as HTMLElement;
    });
    const card = within(cardList);
    const detailsButton = await card.findByRole('button', { name: 'Show details for order active-1' });

    expect(cardList).toHaveClass('2xl:hidden');
    expect(detailsButton).toHaveAttribute('aria-expanded', 'false');
    expect(card.getByRole('combobox', { name: 'Order status active-1' })).toHaveClass('min-h-11');
    expect(card.getByRole('button', { name: /archive order active-1/i })).toHaveClass('min-h-11');
    expect(card.getByRole('button', { name: 'Payment' })).toHaveClass('min-h-11');

    fireEvent.click(detailsButton);
    expect(await card.findByRole('region', { name: 'Order details active-1' })).toBeInTheDocument();
  });
});
