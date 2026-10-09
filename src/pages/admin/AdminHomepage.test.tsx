import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AdminHomepage from './AdminHomepage';

const saveMock = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
      }),
      upsert: async (payload: unknown) => {
        saveMock(payload);
        return { error: null };
      },
    }),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('AdminHomepage', () => {
  it('starts hidden and persists an enabled configuration', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminHomepage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const toggle = await screen.findByRole('switch', { name: /activa/i });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => expect(saveMock).toHaveBeenCalled());
    expect(JSON.parse(saveMock.mock.calls.at(-1)?.[0].setting_value).enabled).toBe(true);
  });
});
