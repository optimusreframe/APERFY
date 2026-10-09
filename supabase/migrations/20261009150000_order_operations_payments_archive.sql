-- Order and request archiving is reversible; records are retained.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_proof_path text,
  ADD COLUMN IF NOT EXISTS payment_proof_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_proof_uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_received_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'submitted', 'received', 'rejected'));

ALTER TABLE public.model_requests
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_archived_created_at_idx
  ON public.orders (archived_at, created_at DESC);

CREATE INDEX IF NOT EXISTS model_requests_archived_created_at_idx
  ON public.model_requests (archived_at, created_at DESC);

CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN ('proof_uploaded', 'received', 'rejected')),
  payment_method text,
  provider text NOT NULL DEFAULT 'manual',
  reference text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
  proof_path text,
  note text,
  actor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_events_proof_order_path_check
    CHECK (proof_path IS NULL OR proof_path LIKE order_id::text || '/%')
);

CREATE INDEX IF NOT EXISTS payment_events_order_created_idx
  ON public.payment_events (order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_events_type_created_idx
  ON public.payment_events (event_type, created_at DESC);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.payment_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.payment_events TO authenticated;

CREATE POLICY "Admins can view payment events"
  ON public.payment_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert payment events"
  ON public.payment_events FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND actor_id = auth.uid()
  );

CREATE OR REPLACE FUNCTION public.prevent_payment_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'payment_events is append-only';
END;
$$;

CREATE TRIGGER payment_events_append_only
  BEFORE UPDATE OR DELETE ON public.payment_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_payment_event_mutation();

CREATE OR REPLACE FUNCTION public.record_order_payment_event(
  p_order_id uuid,
  p_event_type text,
  p_proof_path text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_reference text DEFAULT NULL,
  p_provider text DEFAULT NULL,
  p_currency text DEFAULT 'USD'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_amount numeric;
  v_payment_method text;
  v_provider text;
  v_currency text;
  v_event_id uuid;
BEGIN
  IF NOT public.has_role(v_actor_id, 'admin') THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;

  IF p_event_type IS NULL OR p_event_type NOT IN ('proof_uploaded', 'received', 'rejected') THEN
    RAISE EXCEPTION 'Unsupported payment event type' USING ERRCODE = '22023';
  END IF;

  IF p_currency IS NULL OR upper(p_currency) !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'Currency must be a three-letter ISO code' USING ERRCODE = '22023';
  END IF;

  IF p_event_type = 'proof_uploaded' AND (
    p_proof_path IS NULL
    OR split_part(p_proof_path, '/', 1) <> p_order_id::text
    OR array_length(string_to_array(p_proof_path, '/'), 1) < 2
    OR p_proof_path ~ '(^|/)\.\.(/|$)'
  ) THEN
    RAISE EXCEPTION 'Proof path must be inside its order folder' USING ERRCODE = '22023';
  END IF;

  SELECT total, payment_method
    INTO v_amount, v_payment_method
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;

  v_provider := COALESCE(NULLIF(p_provider, ''), NULLIF(v_payment_method, ''), 'manual');
  v_currency := upper(p_currency);

  IF p_event_type = 'proof_uploaded' THEN
    IF NOT EXISTS (
      SELECT 1 FROM storage.objects
      WHERE bucket_id = 'payment-proofs' AND name = p_proof_path
    ) THEN
      RAISE EXCEPTION 'Payment proof file was not found' USING ERRCODE = 'P0002';
    END IF;
    UPDATE public.orders
      SET payment_status = 'submitted',
          payment_proof_path = p_proof_path,
          payment_proof_uploaded_at = now(),
          payment_proof_uploaded_by = v_actor_id
      WHERE id = p_order_id;
  ELSIF p_event_type = 'received' THEN
    UPDATE public.orders
      SET payment_status = 'received',
          payment_received_at = now(),
          payment_received_by = v_actor_id
      WHERE id = p_order_id;
  ELSIF p_event_type = 'rejected' THEN
    UPDATE public.orders
      SET payment_status = 'rejected',
          payment_received_at = NULL,
          payment_received_by = NULL
      WHERE id = p_order_id;
  END IF;

  INSERT INTO public.payment_events (
    order_id, event_type, payment_method, provider, reference, amount, currency,
    proof_path, note, actor_id, occurred_at, created_at
  ) VALUES (
    p_order_id, p_event_type, v_payment_method, v_provider, p_reference, v_amount,
    v_currency, p_proof_path, p_note, v_actor_id, now(), now()
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_order_payment_event(uuid, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_order_payment_event(uuid, text, text, text, text, text, text) TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false,
  15728640,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Admins can view payment proofs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND public.has_role(auth.uid(), 'admin')
    AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id::text = (storage.foldername(name))[1])
  );

CREATE POLICY "Admins can upload payment proofs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND public.has_role(auth.uid(), 'admin')
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Admins can remove orphaned payment proofs"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND public.has_role(auth.uid(), 'admin')
    AND NOT EXISTS (
      SELECT 1 FROM public.payment_events e
      WHERE e.proof_path = storage.objects.name
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.payment_proof_path = storage.objects.name
    )
  );
