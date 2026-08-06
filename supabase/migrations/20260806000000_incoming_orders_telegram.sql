-- Persist the WhatsApp handoff as an incoming APERFY order event.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'website',
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS telegram_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS telegram_message_id BIGINT,
  ADD COLUMN IF NOT EXISTS telegram_error TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_opened_at TIMESTAMPTZ;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_telegram_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_telegram_status_check
  CHECK (telegram_status IN ('pending', 'sending', 'sent', 'failed'));

CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key_unique
  ON public.orders (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_source_status_created_idx
  ON public.orders (source, status, created_at DESC);

COMMENT ON COLUMN public.orders.source IS 'Origin of the order, for example website or whatsapp.';
COMMENT ON COLUMN public.orders.idempotency_key IS 'Client-generated key preventing duplicate checkout submissions.';
COMMENT ON COLUMN public.orders.telegram_status IS 'Notification lifecycle for the incoming order.';
