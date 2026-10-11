-- Permanent order deletion is deliberately narrow: an order must already be
-- archived and cancelled. This keeps the normal workflow reversible and avoids
-- deleting an order while inventory is still reserved.
CREATE OR REPLACE FUNCTION public.delete_order_for_admin(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status public.order_status;
  v_archived_at timestamptz;
  v_payment_proof_path text;
  v_proof_paths text[];
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;

  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'Order id is required' USING ERRCODE = '22023';
  END IF;

  SELECT status, archived_at, payment_proof_path
    INTO v_status, v_archived_at, v_payment_proof_path
    FROM public.orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_archived_at IS NULL THEN
    RAISE EXCEPTION 'Only archived orders can be permanently deleted' USING ERRCODE = '22023';
  END IF;

  IF v_status <> 'cancelled'::public.order_status THEN
    RAISE EXCEPTION 'Only cancelled orders can be permanently deleted' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT proof_path) FILTER (WHERE proof_path IS NOT NULL AND proof_path <> ''), '{}'::text[])
    INTO v_proof_paths
    FROM (
      SELECT v_payment_proof_path AS proof_path
      UNION ALL
      SELECT e.proof_path
        FROM public.payment_events e
       WHERE e.order_id = p_order_id
    ) AS proof_paths;

  -- payment_events uses RESTRICT intentionally, so remove its audit rows only
  -- after the admin authorization and order-state checks above have passed.
  DELETE FROM public.payment_events WHERE order_id = p_order_id;
  DELETE FROM public.orders WHERE id = p_order_id;

  -- The client removes these paths through the Storage API after the database
  -- transaction succeeds; returning them lets cleanup stay scoped to this order.
  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'proof_paths', to_jsonb(v_proof_paths)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_order_for_admin(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_order_for_admin(uuid) TO authenticated;

COMMENT ON FUNCTION public.delete_order_for_admin(uuid) IS
  'Permanently deletes an admin-owned archived and cancelled order, its order items, and payment event history.';
