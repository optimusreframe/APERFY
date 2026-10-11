import { describe, expect, it, vi } from 'vitest';
import { fetchActiveStorefrontProducts, sortStorefrontProducts } from './storefront-products';

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
  functions: { invoke: vi.fn() },
}));

vi.mock('@/integrations/supabase/client', () => ({ supabase: supabaseMock }));

describe('storefront products query', () => {
  it('returns the complete active catalog instead of applying a 48-item cap', async () => {
    const products = Array.from({ length: 210 }, (_, index) => ({ id: String(index) }));
    supabaseMock.functions.invoke.mockResolvedValue({ data: { products, pricing: { region: 'USA', mode: 'global', currency: 'USD', bcvRate: null } }, error: null });

    const response = await fetchActiveStorefrontProducts();
    expect(response.products).toHaveLength(210);
    expect(response.products.map((product) => product.id)).toEqual(products.map((product) => product.id));
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('sorts the catalog using the customer-facing options', () => {
    const products = [
      { id: 'old', name_en: 'Zulu Lamp', name_es: 'Lámpara Zulu', base_price: 30, is_featured: false, created_at: '2026-01-01T00:00:00Z', inventory_enabled: false, stock_quantity: 0 },
      { id: 'featured', name_en: 'Bravo Cable', name_es: 'Cable Bravo', base_price: 80, is_featured: true, created_at: '2026-02-01T00:00:00Z', inventory_enabled: true, stock_quantity: 5 },
      { id: 'new', name_en: 'Alpha Case', name_es: 'Funda Alpha', base_price: 10, is_featured: false, created_at: '2026-03-01T00:00:00Z', inventory_enabled: true, stock_quantity: 2 },
    ] as never;

    expect(sortStorefrontProducts(products, 'relevant', 'en').map(product => product.id)).toEqual(['featured', 'new', 'old']);
    expect(sortStorefrontProducts(products, 'new', 'en').map(product => product.id)).toEqual(['new', 'featured', 'old']);
    expect(sortStorefrontProducts(products, 'featured', 'en').map(product => product.id)).toEqual(['featured', 'new', 'old']);
    expect(sortStorefrontProducts(products, 'price-asc', 'en').map(product => product.id)).toEqual(['new', 'old', 'featured']);
    expect(sortStorefrontProducts(products, 'price-desc', 'en').map(product => product.id)).toEqual(['featured', 'old', 'new']);
    expect(sortStorefrontProducts(products, 'name-asc', 'en').map(product => product.id)).toEqual(['new', 'featured', 'old']);
    expect(sortStorefrontProducts(products, 'name-desc', 'en').map(product => product.id)).toEqual(['old', 'featured', 'new']);
  });
});
