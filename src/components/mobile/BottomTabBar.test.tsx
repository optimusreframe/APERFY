import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TestMemoryRouter from '@/test/TestMemoryRouter';
import BottomTabBar from './BottomTabBar';

vi.mock('@/contexts/CartContext', () => ({ useCart: () => ({ itemCount: 0 }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, isAdmin: false }) }));

describe('BottomTabBar', () => {
  it('reserves a safe-area-aware app-shell tab row and marks the active route', () => {
    render(
      <TestMemoryRouter initialEntries={['/']}>
        <BottomTabBar />
      </TestMemoryRouter>,
    );

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('z-[70]', 'fixed', 'inset-x-0', 'bottom-0', 'lg:hidden');
    expect(nav).toHaveStyle({ paddingBottom: 'env(safe-area-inset-bottom, 0px)' });
    expect(screen.getByRole('link', { name: 'Inicio' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Carrito' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveClass('min-h-11', 'min-w-11');
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page');
  });
});
