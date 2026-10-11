-- Keep exchange-rate providers separate so an old mirror can never silently
-- replace the provider selected by the administrator.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS exchange_rate_source TEXT NOT NULL DEFAULT 'bcv';

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_exchange_rate_source_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_exchange_rate_source_check
  CHECK (exchange_rate_source IN ('bcv', 'laslucas', 'binance', 'manual'));

COMMENT ON COLUMN public.orders.exchange_rate_source IS 'Exchange-rate provider captured at checkout for USD to VES conversion.';

ALTER TABLE public.currency_rates
  DROP CONSTRAINT IF EXISTS currency_rates_pair_unique,
  DROP CONSTRAINT IF EXISTS currency_rates_source_check;

ALTER TABLE public.currency_rates
  ADD CONSTRAINT currency_rates_source_check
  CHECK (source IN ('bcv', 'laslucas', 'binance', 'manual'));

CREATE UNIQUE INDEX IF NOT EXISTS currency_rates_provider_unique
  ON public.currency_rates (base_currency, quote_currency, source);

INSERT INTO public.admin_settings (setting_key, setting_value)
VALUES ('regional_pricing_rate_source', 'bcv')
ON CONFLICT (setting_key) DO NOTHING;
