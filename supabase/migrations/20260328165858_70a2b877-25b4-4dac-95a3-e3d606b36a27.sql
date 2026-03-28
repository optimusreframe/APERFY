
-- Fix 1: Add INSERT policy on profiles for authenticated users
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Fix 2: Restrict public SELECT policies to active records only
ALTER POLICY "Anyone can view active categories" ON public.categories
  USING (is_active = true);

ALTER POLICY "Anyone can view active materials" ON public.materials
  USING (is_active = true);

ALTER POLICY "Anyone can view active products" ON public.products
  USING (is_active = true);

ALTER POLICY "Anyone can view product variations" ON public.product_variations
  USING (is_active = true);
