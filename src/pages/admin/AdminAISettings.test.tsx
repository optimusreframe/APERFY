import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AdminAISettings from './AdminAISettings';

const settingsRows = vi.hoisted(() => ({
  current: [
    { setting_key: 'ai_provider', setting_value: 'openai' },
    { setting_key: 'ai_model', setting_value: 'gpt-4o-mini' },
    { setting_key: 'ai_search_enabled', setting_value: 'true' },
    { setting_key: 'ai_discount_percent', setting_value: '20' },
    { setting_key: 'ai_provider_key_status', setting_value: 'not_configured' },
  ],
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        in: async () => ({ data: settingsRows.current, error: null }),
      }),
    }),
    functions: {
      invoke: async () => ({
        data: { statuses: [{ name: 'AI_PROVIDER_API_KEY', configured: true }] },
        error: null,
      }),
    },
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('AdminAISettings', () => {
  it('keeps edited provider and model values instead of restoring stale settings', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminAISettings />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const provider = await screen.findByDisplayValue('openai');
    const model = await screen.findByDisplayValue('gpt-4o-mini');

    fireEvent.change(provider, { target: { value: 'deepseek' } });
    fireEvent.change(model, { target: { value: 'deepseek-v4-flash' } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('deepseek')).toBeInTheDocument();
      expect(screen.getByDisplayValue('deepseek-v4-flash')).toBeInTheDocument();
      expect(screen.getByText('READY')).toBeInTheDocument();
    });
  });
});
