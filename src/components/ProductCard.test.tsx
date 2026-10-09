import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/i18n/LanguageContext';
import ProductCard from './ProductCard';

vi.mock('@/components/LikeButton', () => ({ default: () => <button type="button">Like</button> }));
vi.mock('@/components/FavoriteCount', () => ({ default: ({ count }: { count: number }) => <span>{count}</span> }));
vi.mock('@/components/ShareMenu', () => ({ default: () => <button type="button">Share</button> }));

describe('ProductCard', () => {
  it('keeps the price and condition inside the product navigation target', () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <ProductCard
            product={{
              id: 'product-1', name_en: 'Used Camera', name_es: 'Cámara usada', slug: 'used-camera',
              base_price: 25, condition_status: 'used', category_id: null, created_at: '', updated_at: '',
              description_en: null, description_es: null, images: [], inventory_enabled: true,
              inventory_source_key: null, is_active: true, is_featured: false, low_stock_threshold: 3,
              model_3d_url: null, stock_quantity: 1,
            }}
          />
        </LanguageProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('$25.00').closest('a')).toHaveAttribute('href', '/products/used-camera');
    expect(screen.getByText('USED')).toBeInTheDocument();
  });
});
