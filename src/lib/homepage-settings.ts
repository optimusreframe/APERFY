export const HOMEPAGE_HERO_SETTING_KEY = 'homepage_hero';

export type HomepageHeroConfig = {
  enabled: boolean;
  eyebrow_es: string;
  eyebrow_en: string;
  title_es: string;
  title_en: string;
  highlight_es: string;
  highlight_en: string;
  description_es: string;
  description_en: string;
  primary_cta_es: string;
  primary_cta_en: string;
  secondary_cta_es: string;
  secondary_cta_en: string;
};

export const DEFAULT_HOMEPAGE_HERO_CONFIG: HomepageHeroConfig = {
  enabled: false,
  eyebrow_es: 'APERFY · oportunidades activas',
  eyebrow_en: 'APERFY · live opportunities',
  title_es: 'Grandes ofertas',
  title_en: 'Great deals',
  highlight_es: 'a precios que sorprenden.',
  highlight_en: 'at prices that surprise.',
  description_es: 'Descubre productos de muchas categorías, conseguidos en oportunidades de volumen y publicados por debajo del precio habitual del fabricante. Stock real, disponibilidad limitada y nuevas ofertas cuando aparecen.',
  description_en: 'Discover products across many categories, sourced through volume opportunities and published below the manufacturer’s usual price. Real stock, limited availability, and new deals whenever they appear.',
  primary_cta_es: 'Explorar ofertas',
  primary_cta_en: 'Explore deals',
  secondary_cta_es: 'Solicitar un producto',
  secondary_cta_en: 'Request a product',
};

const MAX_LENGTHS: Record<keyof HomepageHeroConfig, number> = {
  enabled: 5,
  eyebrow_es: 80,
  eyebrow_en: 80,
  title_es: 100,
  title_en: 100,
  highlight_es: 120,
  highlight_en: 120,
  description_es: 500,
  description_en: 500,
  primary_cta_es: 50,
  primary_cta_en: 50,
  secondary_cta_es: 50,
  secondary_cta_en: 50,
};

function cleanText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/<[^>]*>/g, '').trim().slice(0, maxLength);
  return cleaned || fallback;
}

export function sanitizeHomepageHeroConfig(value: Partial<HomepageHeroConfig> | null | undefined): HomepageHeroConfig {
  const source = value ?? {};
  return {
    enabled: source.enabled === true,
    eyebrow_es: cleanText(source.eyebrow_es, DEFAULT_HOMEPAGE_HERO_CONFIG.eyebrow_es, MAX_LENGTHS.eyebrow_es),
    eyebrow_en: cleanText(source.eyebrow_en, DEFAULT_HOMEPAGE_HERO_CONFIG.eyebrow_en, MAX_LENGTHS.eyebrow_en),
    title_es: cleanText(source.title_es, DEFAULT_HOMEPAGE_HERO_CONFIG.title_es, MAX_LENGTHS.title_es),
    title_en: cleanText(source.title_en, DEFAULT_HOMEPAGE_HERO_CONFIG.title_en, MAX_LENGTHS.title_en),
    highlight_es: cleanText(source.highlight_es, DEFAULT_HOMEPAGE_HERO_CONFIG.highlight_es, MAX_LENGTHS.highlight_es),
    highlight_en: cleanText(source.highlight_en, DEFAULT_HOMEPAGE_HERO_CONFIG.highlight_en, MAX_LENGTHS.highlight_en),
    description_es: cleanText(source.description_es, DEFAULT_HOMEPAGE_HERO_CONFIG.description_es, MAX_LENGTHS.description_es),
    description_en: cleanText(source.description_en, DEFAULT_HOMEPAGE_HERO_CONFIG.description_en, MAX_LENGTHS.description_en),
    primary_cta_es: cleanText(source.primary_cta_es, DEFAULT_HOMEPAGE_HERO_CONFIG.primary_cta_es, MAX_LENGTHS.primary_cta_es),
    primary_cta_en: cleanText(source.primary_cta_en, DEFAULT_HOMEPAGE_HERO_CONFIG.primary_cta_en, MAX_LENGTHS.primary_cta_en),
    secondary_cta_es: cleanText(source.secondary_cta_es, DEFAULT_HOMEPAGE_HERO_CONFIG.secondary_cta_es, MAX_LENGTHS.secondary_cta_es),
    secondary_cta_en: cleanText(source.secondary_cta_en, DEFAULT_HOMEPAGE_HERO_CONFIG.secondary_cta_en, MAX_LENGTHS.secondary_cta_en),
  };
}

export function parseHomepageHeroConfig(value: string | null | undefined): HomepageHeroConfig {
  if (!value) return DEFAULT_HOMEPAGE_HERO_CONFIG;
  try {
    const parsed: unknown = JSON.parse(value);
    return sanitizeHomepageHeroConfig(parsed && typeof parsed === 'object' ? parsed as Partial<HomepageHeroConfig> : null);
  } catch {
    return DEFAULT_HOMEPAGE_HERO_CONFIG;
  }
}

export function serializeHomepageHeroConfig(config: Partial<HomepageHeroConfig>): string {
  return JSON.stringify(sanitizeHomepageHeroConfig(config));
}

export function getHomepageHeroCopy(locale: 'en' | 'es', config: HomepageHeroConfig = DEFAULT_HOMEPAGE_HERO_CONFIG) {
  return locale === 'es'
    ? { eyebrow: config.eyebrow_es, title: config.title_es, highlight: config.highlight_es, description: config.description_es, primaryCta: config.primary_cta_es, secondaryCta: config.secondary_cta_es }
    : { eyebrow: config.eyebrow_en, title: config.title_en, highlight: config.highlight_en, description: config.description_en, primaryCta: config.primary_cta_en, secondaryCta: config.secondary_cta_en };
}
