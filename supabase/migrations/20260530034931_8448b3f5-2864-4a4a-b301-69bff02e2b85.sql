ALTER TABLE public.product_variations
  ADD COLUMN IF NOT EXISTS price_override numeric NULL,
  ADD COLUMN IF NOT EXISTS use_manual_price boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_url text NULL;