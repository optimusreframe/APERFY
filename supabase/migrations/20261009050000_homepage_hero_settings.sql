INSERT INTO public.admin_settings (setting_key, setting_value)
VALUES (
  'homepage_hero',
  '{"enabled":false,"eyebrow_es":"APERFY · oportunidades activas","eyebrow_en":"APERFY · live opportunities","title_es":"Grandes ofertas","title_en":"Great deals","highlight_es":"a precios que sorprenden.","highlight_en":"at prices that surprise.","description_es":"Descubre productos de muchas categorías, conseguidos en oportunidades de volumen y publicados por debajo del precio habitual del fabricante. Stock real, disponibilidad limitada y nuevas ofertas cuando aparecen.","description_en":"Discover products across many categories, sourced through volume opportunities and published below the manufacturer’s usual price. Real stock, limited availability, and new deals whenever they appear.","primary_cta_es":"Explorar ofertas","primary_cta_en":"Explore deals","secondary_cta_es":"Solicitar un producto","secondary_cta_en":"Request a product"}'
)
ON CONFLICT (setting_key) DO NOTHING;
