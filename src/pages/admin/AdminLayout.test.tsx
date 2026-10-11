import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestMemoryRouter from '@/test/TestMemoryRouter';
import { LanguageProvider } from '@/i18n/LanguageContext';
import AdminLayout from './AdminLayout';

vi.mock('./AdminSidebar', () => ({ default: () => <nav aria-label="Admin navigation" /> }));
vi.mock('@/components/admin/NotificationBell', () => ({ default: () => <button aria-label="Notifications" /> }));
vi.mock('@/components/ThemeToggle', () => ({ default: () => <button aria-label="Toggle theme" /> }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) } },
}));
vi.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarTrigger: () => <button aria-label="Toggle sidebar" />,
}));

describe('AdminLayout', () => {
  it('makes the admin content area independently scrollable', () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <TestMemoryRouter initialEntries={['/admin/integrations']}>
          <LanguageProvider>
            <AdminLayout />
          </LanguageProvider>
        </TestMemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('main')).toHaveClass('flex-1', 'overflow-y-auto');
    expect(screen.getByTestId('aperfy-footer')).toBeInTheDocument();
  });
});
