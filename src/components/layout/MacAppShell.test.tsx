import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MacAppShell from './MacAppShell';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { CartProvider } from '@/contexts/CartContext';

describe('MacAppShell', () => {
  it('renders the APERFY desktop app landmarks and mobile-safe navigation', () => {
    render(<MemoryRouter><LanguageProvider><CartProvider><MacAppShell><div>Store content</div></MacAppShell></CartProvider></LanguageProvider></MemoryRouter>);

    expect(screen.getByRole('banner', { name: /^aperfy$/i })).toBeInTheDocument();
    expect(screen.getByTestId('mac-app-shell')).toHaveAttribute('data-aperfy-shell', 'macos');
    expect(screen.getByTestId('mac-content-scroll')).toHaveClass('overscroll-contain');
    expect(screen.getByRole('navigation', { name: /store navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /request a product/i })).toHaveAttribute('href', '/ask');
    expect(screen.queryByText(/available now/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/how it works/i)).not.toBeInTheDocument();
    expect(screen.getByText('Store content')).toBeInTheDocument();
  });
});
