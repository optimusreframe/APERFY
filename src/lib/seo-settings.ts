export const SEO_SETTINGS_KEY = 'seo_settings';
export const PUBLIC_SITE_URL = 'https://aperfy.kpwr.dev';
export const DEFAULT_SOCIAL_IMAGE = `${PUBLIC_SITE_URL}/logo.png`;

export type SeoSettings = {
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

export const DEFAULT_SEO_SETTINGS: SeoSettings = {
  site_name: 'APERFY',
  title_es: 'APERFY — Encuentra algo perfecto para ti.',
  title_en: 'APERFY — A perfect find, for you.',
  description_es: 'Descubre oportunidades seleccionadas, valor verificado y cantidades limitadas.',
  description_en: 'Curated finds, verified value, and limited quantities.',
  default_image_url: DEFAULT_SOCIAL_IMAGE,
  home_image_url: '',
  request_image_url: '',
  contact_image_url: '',
  auth_image_url: '',
  canonical_url: PUBLIC_SITE_URL,
  google_site_verification: '',
  robots_index: true,
};

const MAX_LENGTHS: Record<keyof SeoSettings, number> = {
  site_name: 80,
  title_es: 160,
  title_en: 160,
  description_es: 320,
  description_en: 320,
  default_image_url: 1000,
  home_image_url: 1000,
  request_image_url: 1000,
  contact_image_url: 1000,
  auth_image_url: 1000,
  canonical_url: 500,
  google_site_verification: 200,
  robots_index: 5,
};

function cleanText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/<[^>]*>/g, '').trim().slice(0, maxLength);
  return cleaned || fallback;
}

function cleanUrl(value: unknown, fallback: string, maxLength: number) {
  const candidate = cleanText(value, fallback, maxLength);
  if (!candidate) return '';
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

export function sanitizeSeoSettings(value: Partial<SeoSettings> | null | undefined): SeoSettings {
  const source = value ?? {};
  return {
    site_name: cleanText(source.site_name, DEFAULT_SEO_SETTINGS.site_name, MAX_LENGTHS.site_name),
    title_es: cleanText(source.title_es, DEFAULT_SEO_SETTINGS.title_es, MAX_LENGTHS.title_es),
    title_en: cleanText(source.title_en, DEFAULT_SEO_SETTINGS.title_en, MAX_LENGTHS.title_en),
    description_es: cleanText(source.description_es, DEFAULT_SEO_SETTINGS.description_es, MAX_LENGTHS.description_es),
    description_en: cleanText(source.description_en, DEFAULT_SEO_SETTINGS.description_en, MAX_LENGTHS.description_en),
    default_image_url: cleanUrl(source.default_image_url, DEFAULT_SEO_SETTINGS.default_image_url, MAX_LENGTHS.default_image_url),
    home_image_url: cleanUrl(source.home_image_url, '', MAX_LENGTHS.home_image_url),
    request_image_url: cleanUrl(source.request_image_url, '', MAX_LENGTHS.request_image_url),
    contact_image_url: cleanUrl(source.contact_image_url, '', MAX_LENGTHS.contact_image_url),
    auth_image_url: cleanUrl(source.auth_image_url, '', MAX_LENGTHS.auth_image_url),
    canonical_url: cleanUrl(source.canonical_url, DEFAULT_SEO_SETTINGS.canonical_url, MAX_LENGTHS.canonical_url).replace(/\/$/, ''),
    google_site_verification: cleanText(source.google_site_verification, '', MAX_LENGTHS.google_site_verification),
    robots_index: source.robots_index !== false,
  };
}

export function parseSeoSettings(value: string | null | undefined): SeoSettings {
  if (!value) return DEFAULT_SEO_SETTINGS;
  try {
    const parsed: unknown = JSON.parse(value);
    return sanitizeSeoSettings(parsed && typeof parsed === 'object' ? parsed as Partial<SeoSettings> : null);
  } catch {
    return DEFAULT_SEO_SETTINGS;
  }
}

export function serializeSeoSettings(settings: Partial<SeoSettings>) {
  return JSON.stringify(sanitizeSeoSettings(settings));
}

export function getSeoImageForPath(pathname: string, settings: SeoSettings) {
  if (pathname === '/') return settings.home_image_url || settings.default_image_url;
  if (pathname.startsWith('/ask')) return settings.request_image_url || settings.default_image_url;
  if (pathname.startsWith('/contact')) return settings.contact_image_url || settings.default_image_url;
  if (pathname.startsWith('/auth') || pathname.startsWith('/reset-password')) return settings.auth_image_url || settings.default_image_url;
  return settings.default_image_url;
}

export function getSeoCopyForPath(pathname: string, language: 'es' | 'en', settings: SeoSettings) {
  const title = language === 'es' ? settings.title_es : settings.title_en;
  const description = language === 'es' ? settings.description_es : settings.description_en;
  if (pathname.startsWith('/ask')) return { title: language === 'es' ? `Solicita un producto · ${settings.site_name}` : `Request a product · ${settings.site_name}`, description };
  if (pathname.startsWith('/contact')) return { title: language === 'es' ? `Contacto · ${settings.site_name}` : `Contact · ${settings.site_name}`, description };
  if (pathname.startsWith('/auth')) return { title: language === 'es' ? `Inicia sesión · ${settings.site_name}` : `Sign in · ${settings.site_name}`, description };
  return { title, description };
}
