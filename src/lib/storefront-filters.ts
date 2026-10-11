import { getInventoryState, type InventoryState } from '@/lib/inventory';
import type { StorefrontProduct, StorefrontSort } from '@/lib/storefront-products';

export type CatalogPriceFilter = 'all' | 'under-25' | '25-75' | 'over-75';
export type CatalogConditionFilter = 'all' | 'new' | 'used';

export type CatalogFilters = {
  category: string;
  price: CatalogPriceFilter;
  availability: 'all' | InventoryState;
  condition: CatalogConditionFilter;
  featuredOnly: boolean;
  sorting: StorefrontSort;
};

export type CatalogFacetOption<T extends string = string> = {
  value: T;
  count: number;
};

export type CatalogFilterFacets = {
  resultCount: number;
  categories: CatalogFacetOption[];
  price: CatalogFacetOption<CatalogPriceFilter>[];
  availability: CatalogFacetOption<CatalogFilters['availability']>[];
  condition: CatalogFacetOption<CatalogConditionFilter>[];
  suggested: {
    featuredCount: number;
    availableCount: number;
    newCount: number;
  };
};

export const DEFAULT_CATALOG_FILTERS: CatalogFilters = {
  category: 'all',
  price: 'all',
  availability: 'all',
  condition: 'all',
  featuredOnly: false,
  sorting: 'relevant',
};

function matchesSearch(product: StorefrontProduct, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  const haystack = `${product.name_en} ${product.name_es} ${product.description_en ?? ''} ${product.description_es ?? ''}`.toLowerCase();
  return haystack.includes(normalizedQuery);
}

function matchesCatalogProduct(product: StorefrontProduct, query: string, filters: CatalogFilters): boolean {
  const amount = Number(product.base_price ?? 0);
  const categoryMatch = filters.category === 'all' || product.categories?.slug === filters.category;
  const priceMatch = filters.price === 'all'
    || (filters.price === 'under-25' && amount < 25)
    || (filters.price === '25-75' && amount >= 25 && amount <= 75)
    || (filters.price === 'over-75' && amount > 75);
  const availabilityMatch = filters.availability === 'all' || getInventoryState(product) === filters.availability;
  const normalizedCondition = product.condition_status === 'used' ? 'used' : 'new';
  const conditionMatch = filters.condition === 'all' || normalizedCondition === filters.condition;
  const featuredMatch = !filters.featuredOnly || product.is_featured;

  return matchesSearch(product, query)
    && categoryMatch
    && priceMatch
    && availabilityMatch
    && conditionMatch
    && featuredMatch;
}

function countForFilterValue(
  products: StorefrontProduct[],
  query: string,
  filters: CatalogFilters,
  key: keyof Pick<CatalogFilters, 'category' | 'price' | 'availability' | 'condition' | 'featuredOnly'>,
  value: CatalogFilters[typeof key],
): number {
  return products.filter(product => matchesCatalogProduct(product, query, { ...filters, [key]: value } as CatalogFilters)).length;
}

/**
 * Builds the currently applicable filter values. Each facet ignores its own
 * active value while respecting the rest of the search, so choosing one
 * filter naturally narrows the options shown by the other filters.
 */
export function getCatalogFilterFacets(
  products: StorefrontProduct[],
  query: string,
  filters: CatalogFilters,
): CatalogFilterFacets {
  const categoryValues = Array.from(new Set(products
    .filter(product => matchesCatalogProduct(product, query, { ...filters, category: 'all' }))
    .map(product => product.categories?.slug)
    .filter((value): value is string => Boolean(value))));

  const categoryOptions: CatalogFacetOption[] = [
    { value: 'all', count: countForFilterValue(products, query, filters, 'category', 'all') },
    ...categoryValues.map(value => ({
      value,
      count: countForFilterValue(products, query, filters, 'category', value),
    })),
  ];

  const priceValues: CatalogPriceFilter[] = ['under-25', '25-75', 'over-75'];
  const priceOptions: CatalogFacetOption<CatalogPriceFilter>[] = [
    { value: 'all', count: countForFilterValue(products, query, filters, 'price', 'all') },
    ...priceValues.map(value => ({ value, count: countForFilterValue(products, query, filters, 'price', value) })),
  ];

  const availabilityValues: CatalogFilters['availability'][] = ['available', 'low', 'sold_out', 'untracked'];
  const availabilityOptions: CatalogFacetOption<CatalogFilters['availability']>[] = [
    { value: 'all', count: countForFilterValue(products, query, filters, 'availability', 'all') },
    ...availabilityValues.map(value => ({ value, count: countForFilterValue(products, query, filters, 'availability', value) })),
  ];

  const conditionValues: CatalogConditionFilter[] = ['new', 'used'];
  const conditionOptions: CatalogFacetOption<CatalogConditionFilter>[] = [
    { value: 'all', count: countForFilterValue(products, query, filters, 'condition', 'all') },
    ...conditionValues.map(value => ({ value, count: countForFilterValue(products, query, filters, 'condition', value) })),
  ];

  return {
    resultCount: products.filter(product => matchesCatalogProduct(product, query, filters)).length,
    categories: categoryOptions,
    price: priceOptions,
    availability: availabilityOptions,
    condition: conditionOptions,
    suggested: {
      featuredCount: countForFilterValue(products, query, filters, 'featuredOnly', true),
      availableCount: countForFilterValue(products, query, filters, 'availability', 'available'),
      newCount: countForFilterValue(products, query, filters, 'condition', 'new'),
    },
  };
}

export function filterStorefrontProducts(
  products: StorefrontProduct[],
  query: string,
  filters: CatalogFilters,
): StorefrontProduct[] {
  return products.filter(product => matchesCatalogProduct(product, query, filters));
}
