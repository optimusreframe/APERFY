
-- 1. Discount codes
CREATE TABLE public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL DEFAULT 0,
  min_purchase numeric NOT NULL DEFAULT 0,
  max_uses integer,
  current_uses integer NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  show_banner boolean NOT NULL DEFAULT false,
  banner_text_en text,
  banner_text_es text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.discount_codes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discount_codes TO authenticated;
GRANT ALL ON public.discount_codes TO service_role;

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active codes" ON public.discount_codes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins manage discount codes" ON public.discount_codes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_discount_codes_updated
  BEFORE UPDATE ON public.discount_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Track which order used which code
ALTER TABLE public.orders ADD COLUMN discount_code_id uuid;
ALTER TABLE public.orders ADD COLUMN discount_amount numeric NOT NULL DEFAULT 0;

-- 2. Admin notifications
CREATE TABLE public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  body text,
  entity_id uuid,
  entity_type text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_notifications TO authenticated;
GRANT ALL ON public.admin_notifications TO service_role;

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage notifications" ON public.admin_notifications
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
ALTER TABLE public.admin_notifications REPLICA IDENTITY FULL;

-- Trigger: notify admins on new order
CREATE OR REPLACE FUNCTION public.notify_admin_new_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, body, entity_id, entity_type, link)
  VALUES ('new_order', 'Nueva orden', 'Orden #' || substring(NEW.id::text, 1, 8) || ' · $' || NEW.total,
          NEW.id, 'order', '/admin/orders');
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_order();

-- Trigger: notify admins on new model request
CREATE OR REPLACE FUNCTION public.notify_admin_new_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, body, entity_id, entity_type, link)
  VALUES ('new_request', 'Nuevo model request', NEW.product_name || ' · ' || NEW.name,
          NEW.id, 'model_request', '/admin/requests');
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_new_request
  AFTER INSERT ON public.model_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_request();

-- 3. 3D model viewer
ALTER TABLE public.products ADD COLUMN model_3d_url text;
