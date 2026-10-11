-- Brand is optional because existing and unbranded catalog items must remain valid.
-- Keeping it nullable preserves the distinction between an unknown brand and a
-- manually entered value while allowing AI imports to populate it when visible.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand TEXT;

COMMENT ON COLUMN public.products.brand IS 'Product manufacturer or consumer-facing brand, when known.';
