ALTER TABLE public.product_variations ADD COLUMN dimensions text DEFAULT NULL;
ALTER TABLE public.product_variations ADD COLUMN material_id uuid DEFAULT NULL;