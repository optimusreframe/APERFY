import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BottomTabBar from './BottomTabBar';

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => true }));
vi.mock('@/contexts/CartContext', () => ({ useCart: () => ({ itemCount: 0 }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, isAdmin: false }) }));

describe('BottomTabBar', () => {
  it('keeps the mobile app navigation above the product dock', () => {
    render(
      <MemoryRouter initialEntries={['/products/example']}>
        <BottomTabBar />
      </MemoryRouter>,
    );

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('z-[70]');
    expect(screen.getByRole('link', { name: 'Inicio' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Carrito' })).toBeVisible();
  });
});
