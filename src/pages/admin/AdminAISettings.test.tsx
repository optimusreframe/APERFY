import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import TestMemoryRouter from '@/test/TestMemoryRouter';
import AdminAISettings from './AdminAISettings';

const settingsRows = vi.hoisted(() => ({
  current: [
    { setting_key: 'ai_provider', setting_value: 'openai' },
    { setting_key: 'ai_model', setting_value: 'gpt-4o-mini' },
    { setting_key: 'ai_search_enabled', setting_value: 'true' },
    { setting_key: 'ai_discount_percent', setting_value: '20' },
    { setting_key: 'ai_provider_key_status', setting_value: 'not_configured' },
    { setting_key: 'ai_image_provider', setting_value: 'openai-compatible' },
    { setting_key: 'ai_image_model', setting_value: 'vision-image-model' },
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
      invoke: async (_name: string, options?: { body?: { provider?: string; role?: string } }) => {
        if (options?.body?.provider) {
          const models = options.body.provider === 'deepseek'
            ? [{ id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash', createdAt: 3 }]
            : options.body.provider === 'openai-compatible'
              ? [{ id: 'vision-image-model', label: 'Vision Image Model', createdAt: 2 }]
              : [{ id: 'gpt-4o-mini', label: 'GPT-4o mini', createdAt: 1 }];
          return { data: { provider: options.body.provider, role: options.body.role, models, updatedAt: '2026-10-11T00:00:00.000Z' }, error: null };
        }
        return {
          data: { statuses: [{ name: 'AI_PROVIDER_API_KEY', configured: true }, { name: 'AI_IMAGE_PROVIDER_API_KEY', configured: true }] },
          error: null,
        };
      },
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
        <TestMemoryRouter>
          <AdminAISettings />
        </TestMemoryRouter>
      </QueryClientProvider>,
    );

    const provider = await screen.findByLabelText('Proveedor para Texto y herramientas');
    const model = await screen.findByLabelText('Modelo para Texto y herramientas');
    await waitFor(() => expect(model).toHaveValue('gpt-4o-mini'));

    fireEvent.change(provider, { target: { value: 'deepseek' } });
    fireEvent.change(model, { target: { value: 'deepseek-v4-flash' } });

    await waitFor(() => {
      expect(provider).toHaveValue('deepseek');
      expect(model).toHaveValue('deepseek-v4-flash');
      expect(screen.getAllByText('READY').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('loads a separate image provider and model', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <TestMemoryRouter>
          <AdminAISettings />
        </TestMemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByLabelText('Proveedor para Visión y análisis de fotos')).toHaveValue('openai-compatible');
    expect(await screen.findByLabelText('Modelo para Visión y análisis de fotos')).toHaveValue('vision-image-model');
    expect(screen.getAllByText('READY').length).toBeGreaterThanOrEqual(2);
  });

  it('shows image-capable providers separately from Claude vision support', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <TestMemoryRouter>
          <AdminAISettings />
        </TestMemoryRouter>
      </QueryClientProvider>,
    );

    const imageProvider = await screen.findByLabelText('Proveedor para Generación de imágenes');
    const imageOptions = Array.from(imageProvider.querySelectorAll('option')).map((option) => option.textContent);

    expect(imageOptions).toContain('GPT / OpenAI');
    expect(imageOptions).toContain('Gemini / Google');
    expect(imageOptions).toContain('OpenRouter');
    expect(imageOptions).not.toContain('Claude / Anthropic');
    expect(screen.getByText(/Claude \/ Anthropic sirve para analizar fotos y texto/)).toBeInTheDocument();
  });
});
