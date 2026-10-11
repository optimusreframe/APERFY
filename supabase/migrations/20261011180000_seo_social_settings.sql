INSERT INTO public.admin_settings (setting_key, setting_value)
VALUES (
  'seo_settings',
  '{"site_name":"APERFY","title_es":"APERFY — Encuentra algo perfecto para ti.","title_en":"APERFY — A perfect find, for you.","description_es":"Descubre oportunidades seleccionadas, valor verificado y cantidades limitadas.","description_en":"Curated finds, verified value, and limited quantities.","default_image_url":"https://aperfy.kpwr.dev/logo.png","home_image_url":"","request_image_url":"","contact_image_url":"","auth_image_url":"","canonical_url":"https://aperfy.kpwr.dev","google_site_verification":"","robots_index":true}'
)
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view site assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'site-assets');

CREATE POLICY "Admins can upload site assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update site assets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete site assets" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'));
