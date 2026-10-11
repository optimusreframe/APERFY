-- The editor already supports dimensions and an optional material reference.
-- Keep both nullable so existing variations remain valid during the rollout.
ALTER TABLE public.product_variations
  ADD COLUMN IF NOT EXISTS dimensions TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS material_id UUID DEFAULT NULL;
