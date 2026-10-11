-- Keep the database trigger aligned with the public pricing resolver. The
-- checkout Edge Function also resolves the value, while this trigger remains
-- the final authority if another trusted path inserts an order item.

CREATE OR REPLACE FUNCTION public.set_authoritative_order_item_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_base numeric;
  product_venezuela numeric;
  product_mode text;
  product_manual_mode text;
  product_markup numeric;
  global_markup numeric := 40;
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

  SELECT CASE
           WHEN setting_value ~ '^\s*[0-9]+(\.[0-9]+)?\s*$' THEN LEAST(1000, GREATEST(0, setting_value::numeric))
           ELSE 40
         END
    INTO global_markup
    FROM public.admin_settings
   WHERE setting_key = 'venezuela_global_markup_percent';
  global_markup := COALESCE(global_markup, 40);

  SELECT p.base_price, p.venezuela_price_usd, p.venezuela_price_mode,
         p.venezuela_manual_mode, p.venezuela_markup_percent, p.is_active
    INTO product_base, product_venezuela, product_mode,
         product_manual_mode, product_markup, product_active
    FROM public.products p
   WHERE p.id = NEW.product_id;

  IF NOT FOUND OR NOT product_active THEN
    RAISE EXCEPTION 'Product is not available' USING ERRCODE = 'P0002';
  END IF;

  IF order_mode = 'geo' AND order_region = 'VENEZUELA' THEN
    IF product_mode = 'manual' AND product_manual_mode = 'fixed' THEN
      product_base := product_venezuela;
    ELSIF product_mode = 'manual' AND product_manual_mode = 'percentage' THEN
      product_base := product_base * (1 + LEAST(1000, GREATEST(0, COALESCE(product_markup, 0))) / 100);
    ELSE
      product_base := product_base * (1 + global_markup / 100);
    END IF;
  END IF;

  IF product_base IS NULL OR product_base < 0 THEN
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
       AND ((order_mode = 'geo' AND order_region = 'VENEZUELA' AND variation_row.price_override_venezuela IS NOT NULL)
         OR (order_mode <> 'geo' OR order_region <> 'VENEZUELA')) THEN
      manual_size_price := CASE
        WHEN order_mode = 'geo' AND order_region = 'VENEZUELA' THEN variation_row.price_override_venezuela
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
GRANT EXECUTE ON FUNCTION public.set_authoritative_order_item_price() TO service_role;
