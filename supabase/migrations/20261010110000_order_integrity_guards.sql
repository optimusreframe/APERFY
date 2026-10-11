-- Keep order and payment data structurally valid at the database boundary.
-- These guards are intentionally additive and do not change existing valid rows.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_total_nonnegative'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_total_nonnegative CHECK (total >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_shipping_cost_nonnegative'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_shipping_cost_nonnegative CHECK (shipping_cost IS NULL OR shipping_cost >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_discount_amount_nonnegative'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_discount_amount_nonnegative CHECK (discount_amount >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_items_quantity_positive'
      AND conrelid = 'public.order_items'::regclass
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_quantity_positive CHECK (quantity > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_items_unit_price_nonnegative'
      AND conrelid = 'public.order_items'::regclass
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_unit_price_nonnegative CHECK (unit_price >= 0);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF (OLD.status = 'pending' AND NEW.status IN ('confirmed', 'cancelled'))
    OR (OLD.status = 'confirmed' AND NEW.status IN ('printing', 'cancelled'))
    OR (OLD.status = 'printing' AND NEW.status IN ('shipped', 'cancelled'))
    OR (OLD.status = 'shipped' AND NEW.status = 'delivered') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid order status transition: % -> %', OLD.status, NEW.status
    USING ERRCODE = '23514';
END;
$$;

DROP TRIGGER IF EXISTS orders_status_transition_guard ON public.orders;
CREATE TRIGGER orders_status_transition_guard
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_status_transition();

-- Audit records must be append-only for authenticated clients. Existing
-- application inserts and the security-definer payment RPC remain available;
-- only direct mutation/deletion paths are removed.
REVOKE UPDATE, DELETE ON public.activity_logs FROM authenticated;
REVOKE UPDATE, DELETE ON public.payment_events FROM authenticated;

COMMENT ON FUNCTION public.enforce_order_status_transition() IS
  'Allows only forward order workflow transitions and cancellation before shipping.';
