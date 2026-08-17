import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
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
      <MemoryRouter initialEntries={['/admin/integrations']}>
        <AdminLayout />
      </MemoryRouter>,
    );

    expect(screen.getByRole('main')).toHaveClass('flex-1', 'overflow-y-auto');
  });
});
