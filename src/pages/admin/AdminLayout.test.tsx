import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import TestMemoryRouter from '@/test/TestMemoryRouter';
import AdminLayout from './AdminLayout';

vi.mock('./AdminSidebar', () => ({ default: () => <nav aria-label="Admin navigation" /> }));
vi.mock('@/components/admin/NotificationBell', () => ({ default: () => <button aria-label="Notifications" /> }));
vi.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarTrigger: () => <button aria-label="Toggle sidebar" />,
}));

describe('AdminLayout', () => {
  it('makes the admin content area independently scrollable', () => {
    render(
      <TestMemoryRouter initialEntries={['/admin/integrations']}>
        <AdminLayout />
      </TestMemoryRouter>,
    );

    expect(screen.getByRole('main')).toHaveClass('flex-1', 'overflow-y-auto');
  });
});
