-- Admin-editable notification templates for email, Telegram, WhatsApp and
-- future push/in-app channels. Secret credentials remain in Vault; this table
-- only stores content and is never exposed to anonymous users.
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'telegram', 'whatsapp', 'push', 'in_app')),
  locale TEXT NOT NULL DEFAULT 'es' CHECK (locale IN ('es', 'en')),
  name TEXT NOT NULL,
  subject TEXT,
  body_text TEXT NOT NULL DEFAULT '',
  body_html TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_key, channel, locale)
);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_templates TO authenticated;
GRANT ALL ON public.notification_templates TO service_role;

DO $$ BEGIN
  CREATE POLICY "Admins manage notification templates"
    ON public.notification_templates FOR ALL TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_notification_templates_channel_event
  ON public.notification_templates(channel, event_key, locale);

DROP TRIGGER IF EXISTS trg_notification_templates_updated_at ON public.notification_templates;
CREATE TRIGGER trg_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.notification_templates
  (event_key, channel, locale, name, subject, body_text, body_html, variables)
VALUES
(
  'order-confirmation', 'email', 'es', 'Confirmación de pedido',
  'Pedido recibido · #{{order_code}}',
  'Hola {{customer_name}}, hemos recibido tu pedido.\n\nPedido: #{{order_code}}\nTotal: {{total}}\nMétodo: {{payment_method}}\n\nProductos:\n{{items_summary}}\n\nEnvío a:\n{{shipping_address}}\n\nTe avisaremos cuando avance.',
  '<!doctype html><html lang="es"><body style="margin:0;background:#09090f;font-family:Arial,sans-serif;color:#f5f7fa"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#09090f;padding:32px 12px"><tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#11151d;border:1px solid #22d86655;border-radius:24px;overflow:hidden"><tr><td style="padding:30px 32px;border-bottom:1px solid #ffffff12"><img src="{{logo_url}}" width="150" alt="APERFY" style="display:block;max-width:150px;height:auto"></td></tr><tr><td style="padding:32px"><p style="margin:0 0 8px;color:#31df70;font-size:11px;letter-spacing:3px;text-transform:uppercase">Pedido confirmado</p><h1 style="margin:0 0 16px;font-size:28px;line-height:1.15;color:#fff">Gracias, {{customer_name}}</h1><p style="margin:0 0 24px;color:#aab3c2;font-size:15px;line-height:1.65">Hemos recibido tu pedido y comenzaremos a procesarlo pronto.</p><div style="background:#0b0e14;border:1px solid #ffffff12;border-radius:16px;padding:20px"><p style="margin:0 0 8px;color:#8791a2;font-size:11px;text-transform:uppercase;letter-spacing:1.5px">Pedido</p><p style="margin:0 0 18px;color:#fff;font-size:18px;font-weight:700">#{{order_code}}</p><p style="margin:0 0 8px;color:#8791a2;font-size:11px;text-transform:uppercase;letter-spacing:1.5px">Total</p><p style="margin:0;color:#31df70;font-size:24px;font-weight:700">{{total}}</p></div><h2 style="margin:28px 0 8px;color:#31df70;font-size:12px;letter-spacing:2px;text-transform:uppercase">Productos</h2><p style="margin:0;color:#c8ced8;font-size:15px;line-height:1.7">{{items_summary}}</p><h2 style="margin:24px 0 8px;color:#31df70;font-size:12px;letter-spacing:2px;text-transform:uppercase">Envío a</h2><p style="margin:0;color:#c8ced8;font-size:15px;line-height:1.7">{{shipping_address}}</p><p style="margin:28px 0 0;color:#8791a2;font-size:13px;line-height:1.6">Te enviaremos actualizaciones cuando tu pedido avance.\n— El equipo APERFY</p></td></tr></table></td></tr></table></body></html>',
  '["customer_name","order_code","total","payment_method","items_summary","shipping_address","logo_url"]'::jsonb
),
(
  'order-confirmation', 'email', 'en', 'Order confirmation',
  'Order received · #{{order_code}}',
  'Hi {{customer_name}}, we received your order.\n\nOrder: #{{order_code}}\nTotal: {{total}}\nMethod: {{payment_method}}\n\nItems:\n{{items_summary}}\n\nShipping to:\n{{shipping_address}}\n\nWe will keep you updated.',
  '<!doctype html><html lang="en"><body style="margin:0;background:#09090f;font-family:Arial,sans-serif;color:#f5f7fa"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#09090f;padding:32px 12px"><tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#11151d;border:1px solid #22d86655;border-radius:24px;overflow:hidden"><tr><td style="padding:30px 32px;border-bottom:1px solid #ffffff12"><img src="{{logo_url}}" width="150" alt="APERFY" style="display:block;max-width:150px;height:auto"></td></tr><tr><td style="padding:32px"><p style="margin:0 0 8px;color:#31df70;font-size:11px;letter-spacing:3px;text-transform:uppercase">Order received</p><h1 style="margin:0 0 16px;font-size:28px;line-height:1.15;color:#fff">Thank you, {{customer_name}}</h1><p style="margin:0 0 24px;color:#aab3c2;font-size:15px;line-height:1.65">We received your order and will begin processing it shortly.</p><div style="background:#0b0e14;border:1px solid #ffffff12;border-radius:16px;padding:20px"><p style="margin:0 0 8px;color:#8791a2;font-size:11px;text-transform:uppercase;letter-spacing:1.5px">Order</p><p style="margin:0 0 18px;color:#fff;font-size:18px;font-weight:700">#{{order_code}}</p><p style="margin:0 0 8px;color:#8791a2;font-size:11px;text-transform:uppercase;letter-spacing:1.5px">Total</p><p style="margin:0;color:#31df70;font-size:24px;font-weight:700">{{total}}</p></div><h2 style="margin:28px 0 8px;color:#31df70;font-size:12px;letter-spacing:2px;text-transform:uppercase">Items</h2><p style="margin:0;color:#c8ced8;font-size:15px;line-height:1.7">{{items_summary}}</p><h2 style="margin:24px 0 8px;color:#31df70;font-size:12px;letter-spacing:2px;text-transform:uppercase">Shipping to</h2><p style="margin:0;color:#c8ced8;font-size:15px;line-height:1.7">{{shipping_address}}</p><p style="margin:28px 0 0;color:#8791a2;font-size:13px;line-height:1.6">We will keep you updated as your order progresses.\n— The APERFY team</p></td></tr></table></td></tr></table></body></html>',
  '["customer_name","order_code","total","payment_method","items_summary","shipping_address","logo_url"]'::jsonb
),
(
  'order.new', 'telegram', 'es', 'Nueva orden · Telegram', NULL,
  'NUEVO PEDIDO APERFY\n\nPedido: #{{order_code}}\nCliente: {{customer_name}}\nTeléfono: {{phone}}\nEmail: {{email}}\nDirección: {{shipping_address}}\n\n{{items_summary}}\n\nTotal: {{total}}\nEstado: Pendiente de confirmación por WhatsApp', NULL,
  '["order_code","customer_name","phone","email","shipping_address","items_summary","total"]'::jsonb
),
(
  'order.new', 'telegram', 'en', 'New order · Telegram', NULL,
  'NEW APERFY ORDER\n\nOrder: #{{order_code}}\nCustomer: {{customer_name}}\nPhone: {{phone}}\nEmail: {{email}}\nAddress: {{shipping_address}}\n\n{{items_summary}}\n\nTotal: {{total}}\nStatus: Pending WhatsApp confirmation', NULL,
  '["order_code","customer_name","phone","email","shipping_address","items_summary","total"]'::jsonb
),
(
  'order.received', 'whatsapp', 'es', 'Confirmación para cliente · WhatsApp', NULL,
  'Hola {{customer_name}}, hemos recibido tu nuevo pedido.\n\nOrden: #{{order_code}}\n{{items_summary}}\n\nTotal: {{total}}\n\n¿Continuamos con tu pedido?\n\nAPERFY', NULL,
  '["customer_name","order_code","items_summary","total"]'::jsonb
),
(
  'order.received', 'whatsapp', 'en', 'Customer confirmation · WhatsApp', NULL,
  'Hi {{customer_name}}, we received your new order.\n\nOrder: #{{order_code}}\n{{items_summary}}\n\nTotal: {{total}}\n\nShall we continue with your order?\n\nAPERFY', NULL,
  '["customer_name","order_code","items_summary","total"]'::jsonb
)
ON CONFLICT (event_key, channel, locale) DO NOTHING;
