import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BottomTabBar from './BottomTabBar';

vi.mock('@/contexts/CartContext', () => ({ useCart: () => ({ itemCount: 0 }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, isAdmin: false }) }));

describe('BottomTabBar', () => {
  it('reserves a safe-area-aware app-shell tab row and marks the active route', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <BottomTabBar />
      </MemoryRouter>,
    );

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('z-[70]', 'shrink-0', 'lg:hidden');
    expect(nav).toHaveStyle({ paddingBottom: 'env(safe-area-inset-bottom, 0px)' });
    expect(screen.getByRole('link', { name: 'Inicio' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Carrito' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveClass('min-h-11', 'min-w-11');
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page');
  });
});
