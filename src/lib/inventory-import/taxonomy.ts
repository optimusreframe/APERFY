export const INVENTORY_CATEGORIES = [
  { slug: 'electronics', name_en: 'Electronics', name_es: 'Electrónica', icon: 'Cpu' },
  { slug: 'computers-accessories', name_en: 'Computers & Accessories', name_es: 'Computadoras y Accesorios', icon: 'Laptop' },
  { slug: 'cell-phones-accessories', name_en: 'Cell Phones & Accessories', name_es: 'Celulares y Accesorios', icon: 'Smartphone' },
  { slug: 'video-games-consoles', name_en: 'Video Games & Consoles', name_es: 'Videojuegos y Consolas', icon: 'Gamepad2' },
  { slug: 'home-kitchen', name_en: 'Home & Kitchen', name_es: 'Hogar y Cocina', icon: 'Home' },
  { slug: 'tools-home-improvement', name_en: 'Tools & Home Improvement', name_es: 'Herramientas y Mejoras del Hogar', icon: 'Wrench' },
  { slug: 'automotive', name_en: 'Automotive', name_es: 'Automotriz', icon: 'Car' },
  { slug: 'sports-outdoors', name_en: 'Sports & Outdoors', name_es: 'Deportes y Aire Libre', icon: 'Dumbbell' },
  { slug: 'toys-games', name_en: 'Toys & Games', name_es: 'Juguetes y Juegos', icon: 'Puzzle' },
  { slug: 'office-products', name_en: 'Office Products', name_es: 'Oficina', icon: 'BriefcaseBusiness' },
  { slug: 'beauty-personal-care', name_en: 'Beauty & Personal Care', name_es: 'Belleza y Cuidado Personal', icon: 'Sparkles' },
  { slug: 'health-household', name_en: 'Health & Household', name_es: 'Salud y Hogar', icon: 'HeartPulse' },
  { slug: 'pet-supplies', name_en: 'Pet Supplies', name_es: 'Mascotas', icon: 'PawPrint' },
  { slug: 'arts-crafts', name_en: 'Arts, Crafts & Sewing', name_es: 'Arte y Manualidades', icon: 'Palette' },
  { slug: '3d-printing', name_en: '3D Printing', name_es: 'Impresión 3D', icon: 'Printer' },
] as const;

export const INVENTORY_CATEGORY_SLUGS = INVENTORY_CATEGORIES.map(({ slug }) => slug);

export type InventoryCategorySlug = typeof INVENTORY_CATEGORIES[number]['slug'];

export function getInventoryCategory(slug: string) {
  return INVENTORY_CATEGORIES.find((category) => category.slug === slug);
}
