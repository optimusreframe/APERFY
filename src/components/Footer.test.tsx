import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LanguageProvider } from '@/i18n/LanguageContext';
import Footer from './Footer';

describe('Footer', () => {
  it('shows the APERFY ownership copy and links to Optimus Reframe', () => {
    render(
      <LanguageProvider>
        <Footer />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('aperfy-footer')).toHaveTextContent(/APERFY/);
    expect(screen.getByTestId('aperfy-footer')).toHaveTextContent(/Andres' Perfect Finds/);
    expect(screen.getByRole('link', { name: /Optimus Reframe/i })).toHaveAttribute('href', 'https://www.optimusreframe.com');
  });
});
