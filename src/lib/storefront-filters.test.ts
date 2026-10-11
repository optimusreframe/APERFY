import { describe, expect, it } from 'vitest';
import { DEFAULT_CATALOG_FILTERS, filterStorefrontProducts, getCatalogFilterFacets } from './storefront-filters';
import type { StorefrontProduct } from './storefront-products';

const products = [
  {
    id: 'featured-new',
    name_en: 'Featured Charger',
    name_es: 'Cargador destacado',
    description_en: 'A compact charger',
    description_es: 'Un cargador compacto',
    base_price: 20,
    condition_status: 'new',
    is_featured: true,
    inventory_enabled: true,
    stock_quantity: 8,
    low_stock_threshold: 2,
    categories: { id: 'electronics', name_en: 'Electronics', name_es: 'Electrónica', slug: 'electronics' },
  },
  {
    id: 'used-desk',
    name_en: 'Used Desk',
    name_es: 'Escritorio usado',
    description_en: 'A larger desk',
    description_es: 'Un escritorio más grande',
    base_price: 80,
    condition_status: 'used',
    is_featured: false,
    inventory_enabled: true,
    stock_quantity: 0,
    low_stock_threshold: 2,
    categories: { id: 'furniture', name_en: 'Furniture', name_es: 'Muebles', slug: 'furniture' },
  },
] as unknown as StorefrontProduct[];

describe('storefront catalog filters', () => {
  it('combines search, category, price, availability, condition, and featured filters', () => {
    const result = filterStorefrontProducts(products, 'compact', {
      ...DEFAULT_CATALOG_FILTERS,
      category: 'electronics',
      price: 'under-25',
      availability: 'available',
      condition: 'new',
      featuredOnly: true,
    });

    expect(result.map(product => product.id)).toEqual(['featured-new']);
  });

  it('returns all products when no optional filter is active', () => {
    expect(filterStorefrontProducts(products, '', DEFAULT_CATALOG_FILTERS)).toHaveLength(2);
  });

  it('builds conditional facets while ignoring each facet own selection', () => {
    const facets = getCatalogFilterFacets(products, '', {
      ...DEFAULT_CATALOG_FILTERS,
      price: 'under-25',
    });

    expect(facets.resultCount).toBe(1);
    expect(facets.categories).toEqual([
      { value: 'all', count: 1 },
      { value: 'electronics', count: 1 },
    ]);
    expect(facets.price).toEqual([
      { value: 'all', count: 2 },
      { value: 'under-25', count: 1 },
      { value: '25-75', count: 0 },
      { value: 'over-75', count: 1 },
    ]);
    expect(facets.condition.find(option => option.value === 'used')?.count).toBe(0);
    expect(facets.suggested.featuredCount).toBe(1);
  });
});
