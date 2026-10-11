-- Social crawlers need the product title, description, and primary image, but
-- the products table intentionally does not grant direct reads to anon.
-- Expose only the minimum published fields through a SECURITY DEFINER RPC.
CREATE OR REPLACE FUNCTION public.get_product_social_preview(p_slug TEXT)
RETURNS TABLE (
  slug TEXT,
  name_es TEXT,
  name_en TEXT,
  description_es TEXT,
  description_en TEXT,
  images JSONB,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.slug,
         p.name_es,
         p.name_en,
         p.description_es,
         p.description_en,
         p.images,
         p.updated_at
    FROM public.products AS p
   WHERE p.slug = p_slug
     AND p.is_active = true
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_product_social_preview(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_social_preview(TEXT) TO anon, authenticated;
