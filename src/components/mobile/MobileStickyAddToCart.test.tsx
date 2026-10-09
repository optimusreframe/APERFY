import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { MOBILE_BOTTOM_NAV_OFFSET } from '@/components/layout/scrollToTop';
import MobileStickyAddToCart from './MobileStickyAddToCart';

describe('MobileStickyAddToCart', () => {
  it('anchors a compact dock directly above the mobile app navigation', () => {
    render(
      <LanguageProvider>
        <MobileStickyAddToCart
          image={null}
          productName="Example product"
          unitPrice={30}
          totalPrice={30}
          quantity={1}
          setQuantity={() => undefined}
          needsVariation={false}
          onAdd={() => undefined}
        />
      </LanguageProvider>,
    );

    const dock = screen.getByTestId('mobile-add-to-cart-dock');
    expect(dock).toHaveStyle({ bottom: MOBILE_BOTTOM_NAV_OFFSET });
    expect(dock).toHaveClass('z-[60]', 'inset-x-0');
    expect(screen.getByRole('button', { name: /agregar|add/i })).toHaveAttribute('type', 'button');
  });
});
