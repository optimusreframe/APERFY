-- Keep Venezuela pricing explicit per product while allowing the administrator
-- to change the global USA + percentage rule without rewriting every product.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS venezuela_price_mode TEXT NOT NULL DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS venezuela_manual_mode TEXT NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS venezuela_markup_percent NUMERIC(7,3);

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_venezuela_price_mode_check,
  DROP CONSTRAINT IF EXISTS products_venezuela_manual_mode_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_venezuela_price_mode_check
    CHECK (venezuela_price_mode IN ('global', 'manual')),
  ADD CONSTRAINT products_venezuela_manual_mode_check
    CHECK (venezuela_manual_mode IN ('fixed', 'percentage'));

INSERT INTO public.admin_settings (setting_key, setting_value)
VALUES ('venezuela_global_markup_percent', '40')
ON CONFLICT (setting_key) DO NOTHING;

COMMENT ON COLUMN public.products.venezuela_price_mode IS 'Global applies the configured USA + percentage rule; manual uses the product-specific rule/value.';
COMMENT ON COLUMN public.products.venezuela_manual_mode IS 'For manual Venezuela pricing, choose a fixed USD price or a percentage over the USA price.';
COMMENT ON COLUMN public.products.venezuela_markup_percent IS 'Product-specific Venezuela markup percentage when manual mode is percentage.';
