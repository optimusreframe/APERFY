-- Cover the foreign keys introduced by order archiving and payment auditing.
-- These indexes keep admin joins, ownership checks, and cleanup lookups fast.
CREATE INDEX IF NOT EXISTS orders_archived_by_idx
  ON public.orders (archived_by);

CREATE INDEX IF NOT EXISTS orders_payment_proof_uploaded_by_idx
  ON public.orders (payment_proof_uploaded_by);

CREATE INDEX IF NOT EXISTS orders_payment_received_by_idx
  ON public.orders (payment_received_by);

CREATE INDEX IF NOT EXISTS model_requests_archived_by_idx
  ON public.model_requests (archived_by);

CREATE INDEX IF NOT EXISTS payment_events_actor_id_idx
  ON public.payment_events (actor_id);

CREATE INDEX IF NOT EXISTS payment_events_updated_by_idx
  ON public.payment_events (updated_by);
