import { supabase } from '@/integrations/supabase/client';
import type { ProductCardProduct } from '@/components/ProductCard';

export type StorefrontProduct = ProductCardProduct & {
  categories?: (NonNullable<ProductCardProduct['categories']> & { slug?: string }) | null;
};

export type StorefrontSort = 'relevant' | 'new' | 'featured' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc';

const STOREFRONT_PAGE_SIZE = 500;

/** Loads every active product, paging explicitly so the catalog never falls back to a small result cap. */
export async function fetchActiveStorefrontProducts(): Promise<StorefrontProduct[]> {
  const products: StorefrontProduct[] = [];
  let pageStart = 0;

  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(id, name_en, name_es, slug)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(pageStart, pageStart + STOREFRONT_PAGE_SIZE - 1);

    if (error) throw error;
    const page = (data ?? []) as StorefrontProduct[];
    products.push(...page);
    if (page.length < STOREFRONT_PAGE_SIZE) break;
    pageStart += STOREFRONT_PAGE_SIZE;
  }

  return products;
}

function availabilityScore(product: StorefrontProduct): number {
  return !product.inventory_enabled || product.stock_quantity > 0 ? 1 : 0;
}

function compareDates(left: StorefrontProduct, right: StorefrontProduct): number {
  return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
}

/** Applies the catalog ordering shown in the storefront's sort control. */
export function sortStorefrontProducts(
  products: StorefrontProduct[],
  sort: StorefrontSort,
  language: 'es' | 'en',
): StorefrontProduct[] {
  const collator = new Intl.Collator(language, { numeric: true, sensitivity: 'base' });
  const getName = (product: StorefrontProduct) => language === 'es' ? product.name_es : product.name_en;

  return [...products].sort((left, right) => {
    if (sort === 'price-asc') return Number(left.base_price) - Number(right.base_price) || compareDates(left, right);
    if (sort === 'price-desc') return Number(right.base_price) - Number(left.base_price) || compareDates(left, right);
    if (sort === 'name-asc') return collator.compare(getName(left), getName(right)) || compareDates(left, right);
    if (sort === 'name-desc') return collator.compare(getName(right), getName(left)) || compareDates(left, right);
    if (sort === 'featured') return Number(right.is_featured) - Number(left.is_featured) || compareDates(left, right);
    if (sort === 'relevant') {
      return Number(right.is_featured) - Number(left.is_featured)
        || availabilityScore(right) - availabilityScore(left)
        || compareDates(left, right);
    }
    return compareDates(left, right);
  });
}
