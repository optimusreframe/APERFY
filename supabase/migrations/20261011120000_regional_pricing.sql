-- Regional pricing is resolved server-side. The browser must never be able to
-- select the raw product price lists or create an order with client-supplied
-- money values.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS venezuela_price_usd NUMERIC(10,2);

-- Existing inventory keeps working after the feature is enabled. Admins can
-- then replace this compatibility value with the Venezuela-specific amount.
UPDATE public.products
   SET venezuela_price_usd = base_price
 WHERE venezuela_price_usd IS NULL;

ALTER TABLE public.product_variations
  ADD COLUMN IF NOT EXISTS price_override_venezuela NUMERIC(10,2);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pricing_region TEXT NOT NULL DEFAULT 'USA',
  ADD COLUMN IF NOT EXISTS pricing_mode TEXT NOT NULL DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS pricing_currency TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS exchange_rate_ves_per_usd NUMERIC(18,8);

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_pricing_region_check,
  DROP CONSTRAINT IF EXISTS orders_pricing_mode_check,
  DROP CONSTRAINT IF EXISTS orders_pricing_currency_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_pricing_region_check CHECK (pricing_region IN ('USA', 'VENEZUELA')),
  ADD CONSTRAINT orders_pricing_mode_check CHECK (pricing_mode IN ('global', 'geo')),
  ADD CONSTRAINT orders_pricing_currency_check CHECK (pricing_currency IN ('USD', 'VES'));

COMMENT ON COLUMN public.products.base_price IS 'USA USD price list. Never expose directly to an untrusted client in GEO mode.';
COMMENT ON COLUMN public.products.venezuela_price_usd IS 'Venezuela USD price list, before VES conversion.';
COMMENT ON COLUMN public.orders.exchange_rate_ves_per_usd IS 'BCV/manual USD to VES rate captured at checkout.';

CREATE TABLE IF NOT EXISTS public.currency_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL DEFAULT 'USD',
  quote_currency TEXT NOT NULL DEFAULT 'VES',
  rate NUMERIC(18,8) NOT NULL CHECK (rate > 0),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('bcv', 'manual')),
  is_automatic BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  source_url TEXT,
  fetched_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT currency_rates_pair_check CHECK (base_currency = 'USD' AND quote_currency = 'VES'),
  CONSTRAINT currency_rates_pair_unique UNIQUE (base_currency, quote_currency)
);

ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.currency_rates FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.currency_rates TO authenticated;

DROP POLICY IF EXISTS "Admins can manage currency rates" ON public.currency_rates;
CREATE POLICY "Admins can manage currency rates"
  ON public.currency_rates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.admin_settings (setting_key, setting_value)
VALUES ('regional_pricing_mode', 'geo')
ON CONFLICT (setting_key) DO NOTHING;

-- Public product reads are served by storefront-pricing, which strips the
-- unused regional price list before returning JSON.
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Anyone can view product variations" ON public.product_variations;
REVOKE SELECT ON TABLE public.products, public.product_variations FROM anon;

-- Direct browser inserts are no longer a trusted order boundary. The
-- create-regional-order Edge Function performs the authenticated insert with
-- the service role after resolving the region and recalculating money.
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own order items" ON public.order_items;
REVOKE INSERT ON TABLE public.orders, public.order_items FROM authenticated;

CREATE OR REPLACE FUNCTION public.set_authoritative_order_item_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_base numeric;
  product_active boolean;
  order_region text;
  order_mode text;
  variation jsonb;
  variation_id uuid;
  variation_row record;
  computed_price numeric;
  manual_size_price numeric;
BEGIN
  IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Order item quantity must be positive' USING ERRCODE = '23514';
  END IF;

  IF jsonb_typeof(COALESCE(NEW.selected_variations, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Selected variations must be a JSON array' USING ERRCODE = '22023';
  END IF;

  SELECT o.pricing_region, o.pricing_mode
    INTO order_region, order_mode
    FROM public.orders o
   WHERE o.id = NEW.order_id;

  SELECT
    CASE
      WHEN order_mode = 'geo' AND order_region = 'VENEZUELA'
        THEN p.venezuela_price_usd
      ELSE p.base_price
    END,
    p.is_active
    INTO product_base, product_active
    FROM public.products p
   WHERE p.id = NEW.product_id;

  IF NOT FOUND OR NOT product_active THEN
    RAISE EXCEPTION 'Product is not available' USING ERRCODE = 'P0002';
  END IF;

  IF order_mode = 'geo' AND order_region = 'VENEZUELA' AND product_base IS NULL THEN
    RAISE EXCEPTION 'Product is not configured for Venezuela' USING ERRCODE = 'P0002';
  END IF;

  computed_price := COALESCE(product_base, 0);

  FOR variation IN SELECT value FROM jsonb_array_elements(COALESCE(NEW.selected_variations, '[]'::jsonb)) LOOP
    BEGIN
      variation_id := (variation->>'id')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid product variation' USING ERRCODE = '22023';
    END;

    SELECT pv.type, pv.price_modifier, pv.price_override,
           pv.price_override_venezuela, pv.use_manual_price
      INTO variation_row
      FROM public.product_variations pv
     WHERE pv.id = variation_id
       AND pv.product_id = NEW.product_id
       AND pv.is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product variation is not available' USING ERRCODE = 'P0002';
    END IF;

    IF variation_row.type = 'size'
       AND variation_row.use_manual_price
       AND (
         (order_mode = 'geo' AND order_region = 'VENEZUELA' AND variation_row.price_override_venezuela IS NOT NULL)
         OR (order_mode <> 'geo' OR order_region <> 'VENEZUELA')
       ) THEN
      manual_size_price := CASE
        WHEN order_mode = 'geo' AND order_region = 'VENEZUELA'
          THEN variation_row.price_override_venezuela
        ELSE variation_row.price_override
      END;
    ELSE
      IF variation_row.type = 'size'
         AND variation_row.use_manual_price
         AND order_mode = 'geo'
         AND order_region = 'VENEZUELA'
         AND variation_row.price_override_venezuela IS NULL THEN
        CONTINUE;
      END IF;
      computed_price := computed_price + COALESCE(variation_row.price_modifier, 0);
    END IF;
  END LOOP;

  NEW.unit_price := GREATEST(0, COALESCE(manual_size_price, computed_price));
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_authoritative_order_item_price() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_stock_for_order_internal(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_stock_for_order_internal(uuid) TO service_role;
