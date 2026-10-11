import { supabase } from '@/integrations/supabase/client';
import type { ProductCardProduct } from '@/components/ProductCard';
import type { StorefrontPricingPayload } from '@/lib/regional-pricing';

export type StorefrontProduct = ProductCardProduct & {
  categories?: (NonNullable<ProductCardProduct['categories']> & { slug?: string }) | null;
  price_ves?: number | null;
  pricing_region?: StorefrontPricingPayload['region'];
  pricing_mode?: StorefrontPricingPayload['mode'];
  bcv_rate_ves_per_usd?: number | null;
};

export interface StorefrontProductsResponse {
  products: StorefrontProduct[];
  pricing: StorefrontPricingPayload;
}

export type StorefrontSort = 'relevant' | 'new' | 'featured' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc';

/** Loads every active product, paging explicitly so the catalog never falls back to a small result cap. */
export async function fetchActiveStorefrontProducts(): Promise<StorefrontProductsResponse> {
  const { data, error } = await supabase.functions.invoke('storefront-pricing', { body: { action: 'catalog' } });
  if (error) throw error;
  const response = data as { products?: StorefrontProduct[]; pricing?: StorefrontPricingPayload } | null;
  if (!response?.pricing || !Array.isArray(response.products)) throw new Error('Invalid storefront pricing response');
  const products = response.products.map((product) => ({
    ...product,
    pricing_region: response.pricing!.region,
    pricing_mode: response.pricing!.mode,
    bcv_rate_ves_per_usd: response.pricing!.bcvRate,
  }));
  return { products, pricing: response.pricing };
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
