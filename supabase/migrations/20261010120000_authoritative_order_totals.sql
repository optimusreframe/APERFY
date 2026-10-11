-- Recompute order item prices and order totals inside Postgres.
-- The browser may submit a cart, but it is not trusted to set money values.

CREATE OR REPLACE FUNCTION public.set_authoritative_order_item_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_base numeric;
  product_active boolean;
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

  SELECT p.base_price, p.is_active
    INTO product_base, product_active
    FROM public.products p
   WHERE p.id = NEW.product_id;

  IF NOT FOUND OR NOT product_active THEN
    RAISE EXCEPTION 'Product is not available' USING ERRCODE = 'P0002';
  END IF;

  computed_price := COALESCE(product_base, 0);

  FOR variation IN SELECT value FROM jsonb_array_elements(COALESCE(NEW.selected_variations, '[]'::jsonb)) LOOP
    BEGIN
      variation_id := (variation->>'id')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid product variation' USING ERRCODE = '22023';
    END;

    SELECT pv.type, pv.price_modifier, pv.price_override, pv.use_manual_price
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
       AND variation_row.price_override IS NOT NULL
       AND variation_row.price_override > 0 THEN
      manual_size_price := variation_row.price_override;
    ELSE
      computed_price := computed_price + COALESCE(variation_row.price_modifier, 0);
    END IF;
  END LOOP;

  NEW.unit_price := GREATEST(0, COALESCE(manual_size_price, computed_price));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_items_authoritative_price ON public.order_items;
CREATE TRIGGER order_items_authoritative_price
  BEFORE INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_authoritative_order_item_price();

CREATE OR REPLACE FUNCTION public.recalculate_order_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_order_id uuid;
  subtotal numeric;
  valid_discount numeric := 0;
  discount_row record;
BEGIN
  target_order_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.order_id ELSE NEW.order_id END;

  SELECT COALESCE(SUM(oi.unit_price * oi.quantity), 0)
    INTO subtotal
    FROM public.order_items oi
   WHERE oi.order_id = target_order_id;

  SELECT d.discount_type, d.discount_value, d.min_purchase
    INTO discount_row
    FROM public.orders o
    JOIN public.discount_codes d ON d.id = o.discount_code_id
   WHERE o.id = target_order_id
     AND d.is_active = true
     AND d.starts_at <= now()
     AND (d.expires_at IS NULL OR d.expires_at >= now())
     AND subtotal >= d.min_purchase
     AND (d.max_uses IS NULL OR d.current_uses < d.max_uses);

  IF FOUND THEN
    valid_discount := CASE
      WHEN discount_row.discount_type = 'percentage'
        THEN subtotal * (discount_row.discount_value / 100)
      ELSE discount_row.discount_value
    END;
    valid_discount := LEAST(GREATEST(valid_discount, 0), subtotal);
  END IF;

  UPDATE public.orders
     SET discount_amount = valid_discount,
         total = GREATEST(0, subtotal + COALESCE(shipping_cost, 0) - valid_discount),
         updated_at = now()
   WHERE id = target_order_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_items_recalculate_total ON public.order_items;
CREATE TRIGGER order_items_recalculate_total
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_order_total();

REVOKE ALL ON FUNCTION public.set_authoritative_order_item_price() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalculate_order_total() FROM PUBLIC, anon, authenticated;
