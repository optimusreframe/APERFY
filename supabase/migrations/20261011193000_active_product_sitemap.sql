-- Keep the products table private while allowing the public sitemap to expose
-- only active slugs and freshness timestamps.
CREATE OR REPLACE FUNCTION public.get_active_product_sitemap()
RETURNS TABLE (slug TEXT, updated_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.slug, p.updated_at
    FROM public.products AS p
   WHERE p.is_active = true
   ORDER BY p.updated_at DESC
   LIMIT 1000;
$$;

REVOKE ALL ON FUNCTION public.get_active_product_sitemap() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_product_sitemap() TO anon, authenticated;
