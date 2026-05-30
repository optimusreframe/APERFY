INSERT INTO public.admin_settings (setting_key, setting_value)
VALUES
  ('ai_3d_tripo_enabled', 'false'),
  ('ai_3d_render_enabled', 'true')
ON CONFLICT (setting_key) DO NOTHING;