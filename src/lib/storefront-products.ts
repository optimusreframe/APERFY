import { supabase } from '@/integrations/supabase/client';
import type { ProductCardProduct } from '@/components/ProductCard';

export type StorefrontProduct = ProductCardProduct & {
  categories?: (NonNullable<ProductCardProduct['categories']> & { slug?: string }) | null;
};

/** Loads the complete active catalog for the storefront without a 48-item cap. */
export async function fetchActiveStorefrontProducts(): Promise<StorefrontProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(id, name_en, name_es, slug)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as StorefrontProduct[];
}
