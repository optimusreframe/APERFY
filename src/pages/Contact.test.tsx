import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/i18n/LanguageContext';
import TestMemoryRouter from '@/test/TestMemoryRouter';
import Contact from './Contact';

describe('Contact', () => {
  it('presents a direct contact path for store questions', () => {
    render(<TestMemoryRouter><LanguageProvider><Contact /></LanguageProvider></TestMemoryRouter>);
    expect(screen.getByRole('heading', { name: /contact aperfy/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /request a product/i })).toHaveAttribute('href', '/ask');
  });
});
