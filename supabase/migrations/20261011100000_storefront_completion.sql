-- Complete the remaining storefront, trust, recovery, and abuse-prevention primitives.
-- All statements are idempotent so this migration can be replayed safely after
-- the project's legacy migration history is reconciled.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS seller_name text NOT NULL DEFAULT 'APERFY',
  ADD COLUMN IF NOT EXISTS return_policy_en text NOT NULL DEFAULT '30-day returns for eligible items. Contact APERFY before returning a product.',
  ADD COLUMN IF NOT EXISTS return_policy_es text NOT NULL DEFAULT 'Devoluciones de 30 días para artículos elegibles. Contacta a APERFY antes de devolver un producto.',
  ADD COLUMN IF NOT EXISTS return_window_days integer NOT NULL DEFAULT 30;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_return_window_days_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_return_window_days_check CHECK (return_window_days >= 0 AND return_window_days <= 365);

ALTER TABLE public.product_reviews
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.mark_verified_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.is_verified := public.has_purchased_product(NEW.user_id, NEW.product_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS product_reviews_verified_purchase ON public.product_reviews;
CREATE TRIGGER product_reviews_verified_purchase
  BEFORE INSERT OR UPDATE OF user_id, product_id ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.mark_verified_review();

DROP POLICY IF EXISTS "Admins can manage reviews" ON public.product_reviews;
CREATE POLICY "Admins can manage reviews"
  ON public.product_reviews FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.product_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL CHECK (length(trim(question)) BETWEEN 3 AND 2000),
  answer text CHECK (answer IS NULL OR length(answer) <= 4000),
  is_public boolean NOT NULL DEFAULT false,
  answered_at timestamptz,
  answered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_questions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS product_questions_product_created_idx
  ON public.product_questions (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS product_questions_user_idx
  ON public.product_questions (user_id, created_at DESC);

DROP POLICY IF EXISTS "Anyone can view public product questions" ON public.product_questions;
CREATE POLICY "Anyone can view public product questions"
  ON public.product_questions FOR SELECT TO public
  USING (is_public = true AND answer IS NOT NULL);

DROP POLICY IF EXISTS "Users can view own product questions" ON public.product_questions;
CREATE POLICY "Users can view own product questions"
  ON public.product_questions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can ask product questions" ON public.product_questions;
CREATE POLICY "Users can ask product questions"
  ON public.product_questions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update unanswered questions" ON public.product_questions;
CREATE POLICY "Users can update unanswered questions"
  ON public.product_questions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND answer IS NULL)
  WITH CHECK (user_id = auth.uid() AND answer IS NULL);

DROP POLICY IF EXISTS "Admins can manage product questions" ON public.product_questions;
CREATE POLICY "Admins can manage product questions"
  ON public.product_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_product_question_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.answer IS NOT NULL AND NEW.answer IS DISTINCT FROM OLD.answer THEN
    NEW.answered_at := now();
    NEW.answered_by := auth.uid();
    NEW.is_public := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS product_questions_updated_at ON public.product_questions;
CREATE TRIGGER product_questions_updated_at
  BEFORE UPDATE ON public.product_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_product_question_updated_at();

CREATE TABLE IF NOT EXISTS public.abandoned_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(items) = 'array'),
  subtotal numeric NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  locale text NOT NULL DEFAULT 'es' CHECK (locale IN ('es', 'en')),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  recovery_sent_at timestamptz,
  converted_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS abandoned_carts_recovery_idx
  ON public.abandoned_carts (last_activity_at, recovery_sent_at)
  WHERE recovery_sent_at IS NULL AND converted_order_id IS NULL;

REVOKE ALL ON public.abandoned_carts FROM anon, authenticated;
GRANT SELECT, UPDATE ON public.abandoned_carts TO service_role;

CREATE OR REPLACE FUNCTION public.upsert_abandoned_cart(
  p_items jsonb,
  p_subtotal numeric,
  p_locale text DEFAULT 'es'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION 'Invalid cart payload' USING ERRCODE = '22023';
  END IF;
  IF p_subtotal IS NULL OR p_subtotal < 0 OR p_subtotal > 999999999 THEN
    RAISE EXCEPTION 'Invalid cart subtotal' USING ERRCODE = '22023';
  END IF;
  IF p_locale NOT IN ('es', 'en') THEN
    RAISE EXCEPTION 'Invalid cart locale' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.abandoned_carts (user_id, items, subtotal, locale, last_activity_at, recovery_sent_at, converted_order_id)
  VALUES (v_user_id, p_items, p_subtotal, p_locale, now(), NULL, NULL)
  ON CONFLICT (user_id) DO UPDATE SET
    items = EXCLUDED.items,
    subtotal = EXCLUDED.subtotal,
    locale = EXCLUDED.locale,
    last_activity_at = now(),
    recovery_sent_at = NULL,
    converted_order_id = NULL,
    updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_abandoned_cart_converted(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.abandoned_carts
  SET converted_order_id = p_order_id, updated_at = now()
  WHERE user_id = auth.uid() AND converted_order_id IS NULL;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_abandoned_cart()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.abandoned_carts WHERE user_id = auth.uid();
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_abandoned_cart(jsonb, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_abandoned_cart_converted(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.clear_abandoned_cart() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_abandoned_cart(jsonb, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_abandoned_cart_converted(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_abandoned_cart() TO authenticated;

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  action text NOT NULL CHECK (length(trim(action)) BETWEEN 1 AND 80),
  scope_key text NOT NULL CHECK (length(trim(scope_key)) BETWEEN 1 AND 200),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (action, scope_key)
);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limit_buckets FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limit_buckets TO service_role;

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_action text,
  p_key text DEFAULT '',
  p_max_attempts integer DEFAULT 5,
  p_window_seconds integer DEFAULT 300
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scope_key text := CASE WHEN auth.uid() IS NOT NULL THEN auth.uid()::text ELSE trim(p_key) END;
  v_row public.rate_limit_buckets%ROWTYPE;
  v_now timestamptz := now();
  v_allowed boolean;
  v_retry integer;
BEGIN
  IF p_action IS NULL OR length(trim(p_action)) NOT BETWEEN 1 AND 80
     OR p_max_attempts < 1 OR p_max_attempts > 100
     OR p_window_seconds < 1 OR p_window_seconds > 86400
     OR v_scope_key IS NULL OR length(v_scope_key) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Invalid rate limit configuration' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.rate_limit_buckets (action, scope_key, window_started_at, attempts, updated_at)
  VALUES (trim(p_action), v_scope_key, v_now, 1, v_now)
  ON CONFLICT (action, scope_key) DO UPDATE SET
    attempts = CASE
      WHEN rate_limit_buckets.window_started_at + make_interval(secs => p_window_seconds) <= v_now THEN 1
      ELSE rate_limit_buckets.attempts + 1
    END,
    window_started_at = CASE
      WHEN rate_limit_buckets.window_started_at + make_interval(secs => p_window_seconds) <= v_now THEN v_now
      ELSE rate_limit_buckets.window_started_at
    END,
    updated_at = v_now
  RETURNING * INTO v_row;

  v_allowed := v_row.attempts <= p_max_attempts;
  v_retry := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_row.window_started_at + make_interval(secs => p_window_seconds) - v_now)))::integer);
  RETURN jsonb_build_object('allowed', v_allowed, 'retry_after_seconds', v_retry, 'attempts', v_row.attempts);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, text, integer, integer) TO authenticated, service_role;

INSERT INTO public.notification_templates (event_key, channel, locale, name, subject, body_text, body_html, enabled, variables)
VALUES
  ('cart-recovery', 'email', 'es', 'Carrito pendiente', 'Tu selección sigue esperándote',
   'Hola {{customer_name}},\n\nGuardamos tu selección en APERFY. Puedes volver a tu carrito aquí:\n{{cart_url}}\n\nProductos:\n{{items_summary}}\n\nSubtotal: {{subtotal}}\n\n— El equipo APERFY',
   '<div style="font-family:Arial,sans-serif;background:#09090f;color:#fff;padding:32px"><div style="max-width:560px;margin:auto;background:#11151d;border:1px solid #31df7055;border-radius:18px;padding:28px"><img src="{{logo_url}}" alt="APERFY" width="150" style="display:block;margin:0 auto 24px"><h1>Tu selección sigue esperándote</h1><p>Hola {{customer_name}}, guardamos tu selección en APERFY.</p><p><a href="{{cart_url}}" style="display:inline-block;background:#31df70;color:#07110b;padding:14px 20px;border-radius:999px;text-decoration:none;font-weight:700">Volver al carrito</a></p><p>{{items_summary}}</p><p><strong>Subtotal: {{subtotal}}</strong></p></div></div>', true,
   '["customer_name","cart_url","items_summary","subtotal","logo_url"]'::jsonb),
  ('cart-recovery', 'email', 'en', 'Cart recovery', 'Your selection is still waiting',
   'Hi {{customer_name}},\n\nWe saved your APERFY selection. Return to your cart here:\n{{cart_url}}\n\nItems:\n{{items_summary}}\n\nSubtotal: {{subtotal}}\n\n— The APERFY team',
   '<div style="font-family:Arial,sans-serif;background:#09090f;color:#fff;padding:32px"><div style="max-width:560px;margin:auto;background:#11151d;border:1px solid #31df7055;border-radius:18px;padding:28px"><img src="{{logo_url}}" alt="APERFY" width="150" style="display:block;margin:0 auto 24px"><h1>Your selection is still waiting</h1><p>Hi {{customer_name}}, we saved your APERFY selection.</p><p><a href="{{cart_url}}" style="display:inline-block;background:#31df70;color:#07110b;padding:14px 20px;border-radius:999px;text-decoration:none;font-weight:700">Return to cart</a></p><p>{{items_summary}}</p><p><strong>Subtotal: {{subtotal}}</strong></p></div></div>', true,
   '["customer_name","cart_url","items_summary","subtotal","logo_url"]'::jsonb)
ON CONFLICT (event_key, channel, locale) DO NOTHING;

COMMENT ON TABLE public.abandoned_carts IS 'Authenticated cart snapshots used for opt-in recovery messages; no payment data is stored.';
COMMENT ON TABLE public.rate_limit_buckets IS 'Server-side abuse-prevention counters. Service role or authenticated RPC only.';

DO $$
DECLARE
  existing_job_id bigint;
BEGIN
  SELECT jobid INTO existing_job_id FROM cron.job WHERE jobname = 'recover-abandoned-carts';
  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;
END
$$;

SELECT cron.schedule(
  'recover-abandoned-carts',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://xftxyvgplghnelawkhvl.supabase.co/functions/v1/recover-abandoned-carts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'EMAIL_QUEUE_CRON_SECRET'),
        ''
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
