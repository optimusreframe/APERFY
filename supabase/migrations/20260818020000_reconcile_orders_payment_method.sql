-- Reconcile production databases where the original payment_method migration
-- was skipped while the checkout client already depended on this column.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT NULL;

COMMENT ON COLUMN public.orders.payment_method IS
  'Payment method selected during checkout, for example whatsapp or zelle.';

NOTIFY pgrst, 'reload schema';
