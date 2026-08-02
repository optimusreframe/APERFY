INSERT INTO public.admin_settings (setting_key, setting_value)
VALUES
  ('ai_provider', 'lovable-gateway'),
  ('ai_model', 'google/gemini-3.1-flash-image-preview'),
  ('ai_search_enabled', 'false'),
  ('ai_discount_percent', '20'),
  ('ai_provider_key_status', 'not_configured')
ON CONFLICT (setting_key) DO NOTHING;
