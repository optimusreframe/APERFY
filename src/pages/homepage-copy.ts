import { DEFAULT_HOMEPAGE_HERO_CONFIG, getHomepageHeroCopy, type HomepageHeroConfig } from '@/lib/homepage-settings';

export type HomepageCopy = {
  eyebrow: string;
  title: string;
  highlight: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  catalogTitle: string;
  catalogDescription: string;
  searchPlaceholder: string;
  dealTitle: string;
  dealDescription: string;
  browseAll: string;
};

export function getHomepageCopy(locale: 'en' | 'es', heroConfig: HomepageHeroConfig = DEFAULT_HOMEPAGE_HERO_CONFIG): HomepageCopy {
  const hero = getHomepageHeroCopy(locale, heroConfig);
  const defaultHero = getHomepageHeroCopy(locale);
  return locale === 'es'
    ? { ...hero, primaryCta: defaultHero.primaryCta, secondaryCta: defaultHero.secondaryCta, heroPrimaryCta: hero.primaryCta, heroSecondaryCta: hero.secondaryCta, catalogTitle: 'Ofertas disponibles ahora', catalogDescription: 'Lo que ves está disponible hoy. Filtra, compara y entra al detalle antes de que se agote.', searchPlaceholder: 'Buscar productos, categorías o marcas…', dealTitle: 'Compra mejor, paga menos', dealDescription: 'Una selección viva de productos a precios especiales, con inventario real y nuevas oportunidades durante la semana.', browseAll: 'Ver todas las ofertas' }
    : { ...hero, primaryCta: defaultHero.primaryCta, secondaryCta: defaultHero.secondaryCta, heroPrimaryCta: hero.primaryCta, heroSecondaryCta: hero.secondaryCta, catalogTitle: 'Deals available now', catalogDescription: 'What you see is available today. Filter, compare, and open the product detail before it sells out.', searchPlaceholder: 'Search products, categories or brands…', dealTitle: 'Buy better, pay less', dealDescription: 'A live selection of products at special prices, with real inventory and new opportunities throughout the week.', browseAll: 'View all deals' };
}
