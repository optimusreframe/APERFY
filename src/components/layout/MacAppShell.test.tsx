import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import TestMemoryRouter from '@/test/TestMemoryRouter';
import MacAppShell from './MacAppShell';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { CartProvider } from '@/contexts/CartContext';

const authState = vi.hoisted(() => ({
  current: { user: null, isAdmin: false },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useOptionalAuth: () => authState.current,
  useAuth: () => authState.current,
}));

describe('MacAppShell', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    authState.current = { user: null, isAdmin: false };
  });

  it('renders the APERFY desktop app landmarks and mobile-safe navigation', () => {
    render(<TestMemoryRouter><LanguageProvider><CartProvider><MacAppShell><div>Store content</div></MacAppShell></CartProvider></LanguageProvider></TestMemoryRouter>);

    expect(screen.getByRole('banner', { name: /^aperfy$/i })).toBeInTheDocument();
    expect(screen.getByTestId('mac-app-shell')).toHaveAttribute('data-aperfy-shell', 'macos');
    expect(screen.getByTestId('mac-content-scroll')).toHaveClass('min-w-0', 'overflow-x-hidden', 'overscroll-contain', 'mac-store-content');
    expect(screen.getByRole('navigation', { name: /store navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /request a product/i })).toHaveAttribute('href', '/ask');
    expect(screen.getByRole('navigation', { name: /navegación principal/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByText(/available now/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/how it works/i)).not.toBeInTheDocument();
    expect(screen.getByText('Store content')).toBeInTheDocument();
  });

  it('changes the language from Spanish to English when the language button is pressed', () => {
    localStorage.setItem('aperfy-lang', 'es');
    render(<TestMemoryRouter><LanguageProvider><CartProvider><MacAppShell><div>Store content</div></MacAppShell></CartProvider></LanguageProvider></TestMemoryRouter>);

    const languageButton = screen.getByRole('button', { name: 'Cambiar idioma' });
    expect(languageButton).toHaveTextContent('es');
    expect(screen.getByRole('link', { name: /solicitar producto/i })).toBeInTheDocument();

    fireEvent.click(languageButton);

    expect(screen.getByRole('button', { name: 'Toggle language' })).toHaveTextContent('en');
    expect(screen.getByRole('link', { name: /request a product/i })).toBeInTheDocument();
  });

  it('shows an admin shield that opens the admin console for administrators', () => {
    authState.current = { user: { id: 'admin-user' }, isAdmin: true };

    render(<TestMemoryRouter><LanguageProvider><CartProvider><MacAppShell><div>Store content</div></MacAppShell></CartProvider></LanguageProvider></TestMemoryRouter>);

    expect(screen.getByRole('link', { name: /open admin console/i })).toHaveAttribute('href', '/admin');
  });
});
