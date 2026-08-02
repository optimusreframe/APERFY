import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/i18n/LanguageContext';
import Contact from './Contact';

describe('Contact', () => {
  it('presents a direct contact path for store questions', () => {
    render(<MemoryRouter><LanguageProvider><Contact /></LanguageProvider></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /contact aperfy/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /request a product/i })).toHaveAttribute('href', '/ask');
  });
});
