import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, Boxes, Search, ShoppingBag, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { useLanguage } from '@/i18n/LanguageContext';
import { getHomepageCopy } from './homepage-copy';
export { getHomepageCopy } from './homepage-copy';

type Product = { id: string; name_en: string; name_es: string; description_en?: string | null; description_es?: string | null; base_price?: number | string | null; categories?: { name_en?: string; name_es?: string; slug?: string } | null; [key: string]: unknown };
const reveal = { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-10% 0px' }, transition: { duration: .4, ease: [0.2, 0, 0, 1] } } as const;

export default function Index() {
  const { language } = useLanguage();
  const copy = getHomepageCopy(language);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [price, setPrice] = useState('all');
  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ['aperfy-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*, categories(id, name_en, name_es, slug)').eq('is_active', true).order('created_at', { ascending: false }).limit(48);
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });
  const es = language === 'es';
  const categories = useMemo(() => Array.from(new Map(products.map(product => { const label = es ? product.categories?.name_es : product.categories?.name_en; return [product.categories?.slug || label || '', label || '']; }).filter(([value, label]) => value && label)).entries()), [products, es]);
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter(product => {
      const haystack = `${product.name_en} ${product.name_es} ${product.description_en ?? ''} ${product.description_es ?? ''}`.toLowerCase();
      const amount = Number(product.base_price ?? 0);
      const categoryMatch = category === 'all' || product.categories?.slug === category;
      const priceMatch = price === 'all' || (price === 'under-25' && amount < 25) || (price === '25-75' && amount >= 25 && amount <= 75) || (price === 'over-75' && amount > 75);
      return (!query || haystack.includes(query)) && categoryMatch && priceMatch;
    });
  }, [products, search, category, price]);

  return <>
    <main>
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .35 }} className="border-b border-border/70 bg-card/45">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-7 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
          <div><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.2em] text-primary">APERFY · {es ? 'oportunidades activas' : 'live opportunities'}</p><h1 className="max-w-3xl text-4xl font-semibold leading-none tracking-[-.06em] sm:text-6xl">{copy.title} <span className="text-primary">{copy.highlight}</span></h1><p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{copy.description}</p></div>
          <div className="flex shrink-0 flex-wrap gap-2"><Link to="#deals" className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5">{copy.primaryCta}<ArrowRight className="h-4 w-4" /></Link><Link to="/ask" className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold transition-colors hover:border-primary/50">{copy.secondaryCta}</Link></div>
        </div>
      </motion.section>
      <motion.section {...reveal} id="deals" className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
        <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-primary"><ShoppingBag className="h-4 w-4" />{es ? 'Tienda en vivo' : 'Live storefront'}</div><h2 className="text-3xl font-semibold tracking-[-.045em] sm:text-5xl">{copy.catalogTitle}</h2><p className="mt-3 max-w-xl text-muted-foreground">{copy.catalogDescription}</p></div><div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto"><div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={copy.searchPlaceholder} aria-label={copy.searchPlaceholder} className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 outline-none transition-shadow focus:ring-2 focus:ring-primary/30" /></div><div className="flex gap-2"><label className="sr-only" htmlFor="home-category-filter">{es ? 'Categoría' : 'Category'}</label><select id="home-category-filter" value={category} onChange={event => setCategory(event.target.value)} className="h-11 min-w-36 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"><option value="all">{es ? 'Categorías' : 'Categories'}</option>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><label className="sr-only" htmlFor="home-price-filter">{es ? 'Precio' : 'Price'}</label><select id="home-price-filter" value={price} onChange={event => setPrice(event.target.value)} className="h-11 min-w-32 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"><option value="all">{es ? 'Precio' : 'Price'}</option><option value="under-25">{es ? 'Menos de $25' : 'Under $25'}</option><option value="25-75">$25–$75</option><option value="over-75">{es ? 'Más de $75' : 'Over $75'}</option></select></div></div></div>
        {isLoading && <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl bg-muted" />)}</div>}
        {isError && <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-muted-foreground">{es ? 'No pudimos cargar las ofertas disponibles. Intenta de nuevo en unos segundos.' : 'We could not load available deals. Try again in a few seconds.'}</div>}
        {!isLoading && !isError && visible.length > 0 && <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{visible.map((product, index) => <ProductCard key={product.id} product={product} index={index} showBadges />)}</div>}
        {!isLoading && !isError && visible.length === 0 && <div className="rounded-2xl border border-dashed border-border p-12 text-center"><Boxes className="mx-auto h-6 w-6 text-primary" /><p className="mt-4 font-semibold">{es ? 'No hay ofertas con esos filtros.' : 'No deals match those filters.'}</p><p className="mt-2 text-sm text-muted-foreground">{es ? 'Prueba otra búsqueda o solicita un producto específico.' : 'Try another search or request a specific product.'}</p><Link to="/ask" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">{copy.secondaryCta}<ArrowRight className="h-4 w-4" /></Link></div>}
        <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><SlidersHorizontal className="h-3.5 w-3.5 text-primary" />{visible.length} {es ? 'ofertas visibles · stock real y limitado' : 'visible deals · real and limited stock'}</p>
      </motion.section>
      <motion.section {...reveal} className="border-y border-border/70 bg-secondary/35"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-10 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">{es ? '¿Buscas algo concreto?' : 'Looking for something specific?'}</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">{es ? 'Pídenos que lo encontremos.' : 'Ask us to find it.'}</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{es ? 'Déjanos los detalles y te avisaremos si conseguimos una oferta para publicarla en APERFY.' : 'Share the details and we will let you know if we find a deal worth publishing on APERFY.'}</p></div><Link to="/ask" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/[0.08] px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/[0.14]">{copy.secondaryCta}<ArrowRight className="h-4 w-4" /></Link></div></motion.section>
    </main>
    <Footer />
  </>;
}
