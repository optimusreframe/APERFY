-- Add the clean shopper-facing taxonomy without modifying existing APERFY categories.
INSERT INTO public.categories (name_en, name_es, slug, icon, is_active)
VALUES
  ('Electronics', 'Electrónica', 'electronics', 'Cpu', true),
  ('Computers & Accessories', 'Computadoras y Accesorios', 'computers-accessories', 'Laptop', true),
  ('Cell Phones & Accessories', 'Celulares y Accesorios', 'cell-phones-accessories', 'Smartphone', true),
  ('Video Games & Consoles', 'Videojuegos y Consolas', 'video-games-consoles', 'Gamepad2', true),
  ('Home & Kitchen', 'Hogar y Cocina', 'home-kitchen', 'Home', true),
  ('Tools & Home Improvement', 'Herramientas y Mejoras del Hogar', 'tools-home-improvement', 'Wrench', true),
  ('Automotive', 'Automotriz', 'automotive', 'Car', true),
  ('Sports & Outdoors', 'Deportes y Aire Libre', 'sports-outdoors', 'Dumbbell', true),
  ('Toys & Games', 'Juguetes y Juegos', 'toys-games', 'Puzzle', true),
  ('Office Products', 'Oficina', 'office-products', 'BriefcaseBusiness', true),
  ('Beauty & Personal Care', 'Belleza y Cuidado Personal', 'beauty-personal-care', 'Sparkles', true),
  ('Health & Household', 'Salud y Hogar', 'health-household', 'HeartPulse', true),
  ('Pet Supplies', 'Mascotas', 'pet-supplies', 'PawPrint', true),
  ('Arts, Crafts & Sewing', 'Arte y Manualidades', 'arts-crafts', 'Palette', true),
  ('3D Printing', 'Impresión 3D', '3d-printing', 'Printer', true)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS inventory_source_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS products_inventory_source_key_key
  ON public.products (inventory_source_key)
  WHERE inventory_source_key IS NOT NULL;
