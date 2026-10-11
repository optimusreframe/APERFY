type SeoSettings = {
  site_name: string;
  title_es: string;
  title_en: string;
  description_es: string;
  description_en: string;
  default_image_url: string;
  home_image_url: string;
  request_image_url: string;
  contact_image_url: string;
  auth_image_url: string;
  canonical_url: string;
  google_site_verification: string;
  robots_index: boolean;
};

type Product = {
  slug: string;
  name_es: string;
  name_en: string;
  description_es: string | null;
  description_en: string | null;
  images: unknown;
  updated_at: string;
};

const DEFAULTS: SeoSettings = {
  site_name: 'APERFY',
  title_es: 'APERFY — Encuentra algo perfecto para ti.',
  title_en: 'APERFY — A perfect find, for you.',
  description_es: 'Descubre oportunidades seleccionadas, valor verificado y cantidades limitadas.',
  description_en: 'Curated finds, verified value, and limited quantities.',
  default_image_url: 'https://aperfy.kpwr.dev/logo.png',
  home_image_url: '',
  request_image_url: '',
  contact_image_url: '',
  auth_image_url: '',
  canonical_url: 'https://aperfy.kpwr.dev',
  google_site_verification: '',
  robots_index: true,
};

const IMAGE_EXTENSIONS = /\.(?:avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i;

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    key: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
  };
}

async function fetchSupabaseRows<T>(table: string, query: Record<string, string>): Promise<T[]> {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return [];
  const endpoint = new URL(`${url.replace(/\/$/, '')}/rest/v1/${table}`);
  Object.entries(query).forEach(([name, value]) => endpoint.searchParams.set(name, value));
  const response = await fetch(endpoint, { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' } });
  if (!response.ok) return [];
  return await response.json() as T[];
}

function parseSettings(value: unknown): SeoSettings {
  if (typeof value !== 'string') return DEFAULTS;
  try {
    const parsed = JSON.parse(value) as Partial<SeoSettings>;
    return { ...DEFAULTS, ...parsed, robots_index: parsed.robots_index !== false };
  } catch {
    return DEFAULTS;
  }
}

function firstImage(images: unknown) {
  if (!Array.isArray(images)) return '';
  return images.find((image): image is string => typeof image === 'string' && IMAGE_EXTENSIONS.test(image)) || '';
}

function getOrigin(request: Request, settings: SeoSettings) {
  const requestUrl = new URL(request.url);
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || requestUrl.host;
  const protocol = request.headers.get('x-forwarded-proto') || requestUrl.protocol.replace(':', '');
  return `${protocol}://${host}`.replace(/\/$/, '') || settings.canonical_url;
}

function generalImage(pathname: string, settings: SeoSettings) {
  if (pathname === '/' && settings.home_image_url) return settings.home_image_url;
  if (pathname.startsWith('/ask') && settings.request_image_url) return settings.request_image_url;
  if (pathname.startsWith('/contact') && settings.contact_image_url) return settings.contact_image_url;
  if ((pathname.startsWith('/auth') || pathname.startsWith('/reset-password')) && settings.auth_image_url) return settings.auth_image_url;
  return settings.default_image_url;
}

function buildHtml(input: { url: string; title: string; description: string; image: string; siteName: string; robots: string; verification: string; product?: Product }) {
  const jsonLd = input.product ? JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.title,
    description: input.description,
    image: input.image ? [input.image] : [],
    url: input.url,
  }).replace(/</g, '\\u003c') : '';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.title)}</title><meta name="description" content="${escapeHtml(input.description)}"><meta name="robots" content="${escapeHtml(input.robots)}"><link rel="canonical" href="${escapeHtml(input.url)}"><meta property="og:type" content="${input.product ? 'product' : 'website'}"><meta property="og:site_name" content="${escapeHtml(input.siteName)}"><meta property="og:title" content="${escapeHtml(input.title)}"><meta property="og:description" content="${escapeHtml(input.description)}"><meta property="og:url" content="${escapeHtml(input.url)}"><meta property="og:image" content="${escapeHtml(input.image)}"><meta property="og:image:alt" content="${escapeHtml(input.title)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(input.title)}"><meta name="twitter:description" content="${escapeHtml(input.description)}"><meta name="twitter:image" content="${escapeHtml(input.image)}">${input.verification ? `<meta name="google-site-verification" content="${escapeHtml(input.verification)}">` : ''}${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : ''}</head><body><main><h1>${escapeHtml(input.title)}</h1>${input.image ? `<img src="${escapeHtml(input.image)}" alt="${escapeHtml(input.title)}">` : ''}<p>${escapeHtml(input.description)}</p><a href="${escapeHtml(input.url)}">Abrir APERFY</a></main></body></html>`;
}

export default {
  async fetch(request: Request) {
    const requestUrl = new URL(request.url);
    const settingsRows = await fetchSupabaseRows<{ setting_value: string | null }>('admin_settings', { select: 'setting_value', setting_key: 'eq.seo_settings', limit: '1' });
    const settings = parseSettings(settingsRows[0]?.setting_value);
    const slug = requestUrl.searchParams.get('slug');
    const pathname = slug ? `/products/${slug}` : requestUrl.searchParams.get('path') || '/';
    const origin = getOrigin(request, settings);
    const canonical = new URL(pathname, `${origin}/`).toString();
    const spanish = (request.headers.get('accept-language') || '').toLowerCase().includes('es');
    const productRows = slug ? await fetchSupabaseRows<Product>('products', { select: 'slug,name_es,name_en,description_es,description_en,images,updated_at', slug: `eq.${slug}`, is_active: 'eq.true', limit: '1' }) : [];
    const product = productRows[0];
    const title = product ? `${spanish ? product.name_es : product.name_en} · ${settings.site_name}` : (spanish ? settings.title_es : settings.title_en);
    const description = product ? ((spanish ? product.description_es : product.description_en)?.trim() || `${title} · ${settings.site_name}`) : (pathname.startsWith('/ask') ? (spanish ? `Solicita un producto · ${settings.site_name}` : `Request a product · ${settings.site_name}`) : pathname.startsWith('/contact') ? (spanish ? `Contacto · ${settings.site_name}` : `Contact · ${settings.site_name}`) : (spanish ? settings.description_es : settings.description_en));
    const image = product ? firstImage(product.images) || settings.default_image_url : generalImage(pathname, settings);
    const html = buildHtml({ url: canonical, title, description: description.slice(0, 320), image, siteName: settings.site_name, robots: settings.robots_index ? 'index,follow' : 'noindex,nofollow', verification: settings.google_site_verification, product });
    return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400', 'Vercel-CDN-Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' } });
  },
};
