import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, Boxes, Search, ShoppingBag, Sparkles, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import MacAppShell from '@/components/layout/MacAppShell';
import TrustInstrumentation from '@/components/landing/TrustInstrumentation';
import { useLanguage } from '@/i18n/LanguageContext';
import { getHomepageCopy } from './homepage-copy';
export { getHomepageCopy } from './homepage-copy';

type Product = { id: string; name_en: string; name_es: string; description_en?: string | null; [key: string]: unknown };

const reveal = { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-10% 0px' }, transition: { duration: .4, ease: [0.2, 0, 0, 1] } } as const;

export default function Index() {
  const { language } = useLanguage();
  const copy = getHomepageCopy(language);
  const [search, setSearch] = useState('');
  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ['aperfy-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*, categories(id, name_en, name_es, slug)').eq('is_active', true).order('created_at', { ascending: false }).limit(12);
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });
  const visible = useMemo(() => { const query = search.trim().toLowerCase(); if (!query) return products; return products.filter(product => `${product.name_en} ${product.name_es} ${product.description_en ?? ''}`.toLowerCase().includes(query)); }, [products, search]);
  const es = language === 'es';

  return <MacAppShell>
    <main>
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .35 }} className="mac-hero relative overflow-hidden border-b border-border/70">
        <div className="mac-hero-orbit" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.04fr_.96fr] lg:items-center lg:px-12 lg:py-20">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.08] px-3 py-1.5 text-xs font-medium text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" />{es ? 'Tienda APERFY · disponible ahora' : 'APERFY Store · available now'}</div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[.92] tracking-[-.06em] text-foreground sm:text-7xl lg:text-[5.8rem]">{copy.title}<br /><span className="text-primary">{copy.highlight}</span></h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">{copy.description}</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link to="/catalog" className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5">{copy.primaryCta}<ArrowRight className="h-4 w-4" /></Link><Link to="/our-process" className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-card px-5 font-semibold transition-colors hover:border-primary/40">{copy.secondaryCta}</Link></div>
          </div>
          <div className="mac-deal-panel relative overflow-hidden rounded-2xl border border-primary/25 bg-card p-5 shadow-[0_24px_80px_hsl(160_60%_5%/.35)] sm:p-7"><div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/15 blur-3xl" /><div className="relative"><div className="mb-8 flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">{es ? 'Ventana de oportunidad' : 'Opportunity window'}</span><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.14em] text-primary">{es ? 'Stock limitado' : 'Limited stock'}</span></div><div className="grid gap-5"><div className="flex h-44 items-center justify-center rounded-xl border border-primary/10 bg-[radial-gradient(circle_at_50%_42%,hsl(var(--primary)/.3),transparent_24%),radial-gradient(circle_at_50%_50%,hsl(var(--primary)/.08),transparent_60%),linear-gradient(145deg,hsl(160_22%_12%),hsl(160_24%_6%))]"><Boxes className="h-20 w-20 text-primary/80" strokeWidth={1} /></div><div className="flex items-end justify-between gap-4"><div><p className="text-xl font-semibold tracking-[-.03em]">{es ? 'Big deals, seleccionados' : 'Big deals, selected'}</p><p className="mt-1 text-sm text-muted-foreground">{es ? 'Compras al mayor · precio APERFY' : 'Bulk purchases · APERFY pricing'}</p></div><Sparkles className="h-6 w-6 text-primary" /></div></div></div></div></div>
      </motion.section>

      <motion.section {...reveal} className="mx-auto max-w-7xl px-5 py-7 sm:px-8 lg:px-12"><TrustInstrumentation locale={language} /></motion.section>

      <motion.section {...reveal} className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-primary"><ShoppingBag className="h-4 w-4" />{es ? 'Catálogo vivo' : 'Live catalog'}</div><h2 className="text-3xl font-semibold tracking-[-.045em] sm:text-5xl">{copy.catalogTitle}</h2><p className="mt-3 max-w-xl text-muted-foreground">{copy.catalogDescription}</p></div><div className="flex w-full gap-2 sm:w-auto"><div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={copy.searchPlaceholder} aria-label={copy.searchPlaceholder} className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 outline-none transition-shadow focus:ring-2 focus:ring-primary/30" /></div><Link to="/catalog" aria-label={copy.browseAll} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"><Search className="h-4 w-4" /></Link></div></div>
        {isLoading && <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl bg-muted" />)}</div>}
        {isError && <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-muted-foreground">{es ? 'No pudimos cargar los productos disponibles. Intenta de nuevo en unos segundos.' : 'We could not load available products. Try again in a few seconds.'}</div>}
        {!isLoading && !isError && visible.length > 0 && <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{visible.map((product, index) => <ProductCard key={product.id} product={product} index={index} showBadges />)}</div>}
        {!isLoading && !isError && visible.length === 0 && <div className="rounded-2xl border border-dashed border-border p-12 text-center"><Boxes className="mx-auto h-6 w-6 text-primary" /><p className="mt-4 font-semibold">{es ? 'No hay productos con ese filtro.' : 'No products match that filter.'}</p><p className="mt-2 text-sm text-muted-foreground">{es ? 'Prueba otra búsqueda o vuelve pronto para ver nuevas oportunidades.' : 'Try another search or come back soon for new opportunities.'}</p></div>}
        <div className="mt-8 text-center"><Link to="/catalog" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">{copy.browseAll}<ArrowRight className="h-4 w-4" /></Link></div>
      </motion.section>

      <motion.section {...reveal} className="border-y border-border/70 bg-secondary/35"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[.7fr_1.3fr] lg:px-12"><div><h2 className="text-3xl font-semibold tracking-[-.045em] sm:text-4xl">{copy.dealTitle}</h2><p className="mt-4 max-w-md leading-relaxed text-muted-foreground">{copy.dealDescription}</p></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-border bg-card p-5"><ShoppingBag className="h-5 w-5 text-primary" /><p className="mt-4 font-semibold">{es ? 'Compras al mayor' : 'Bulk purchases'}</p><p className="mt-2 text-sm text-muted-foreground">{es ? 'Buscamos mejores costes por volumen.' : 'We look for better costs by volume.'}</p></div><div className="rounded-xl border border-border bg-card p-5"><Truck className="h-5 w-5 text-primary" /><p className="mt-4 font-semibold">{es ? 'Disponible hoy' : 'Available today'}</p><p className="mt-2 text-sm text-muted-foreground">{es ? 'El inventario publicado es el real.' : 'Published inventory is the real inventory.'}</p></div><div className="rounded-xl border border-border bg-card p-5"><Boxes className="h-5 w-5 text-primary" /><p className="mt-4 font-semibold">{es ? 'Nuevos drops' : 'New drops'}</p><p className="mt-2 text-sm text-muted-foreground">{es ? 'Nuevos productos pueden llegar cada día.' : 'New products can arrive every day.'}</p></div></div></div></motion.section>

      <motion.section {...reveal} className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12"><div className="grid gap-4 sm:grid-cols-3"><div className="sm:col-span-2 rounded-2xl border border-primary/20 bg-primary/[0.06] p-7"><p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">{es ? 'La regla APERFY' : 'The APERFY rule'}</p><h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-.045em]">{es ? 'Lo publicado es lo disponible.' : 'What is published is what is available.'}</h2><p className="mt-3 max-w-xl text-muted-foreground">{es ? 'El stock no está garantizado para siempre. Si encuentras algo que te gusta, revisa los detalles y añádelo al carrito.' : 'Stock is not guaranteed forever. If you find something you like, review the details and add it to your cart.'}</p></div><Link to="/catalog" className="group flex min-h-40 flex-col justify-between rounded-2xl border border-border bg-card p-7 transition-colors hover:border-primary/50"><span className="text-sm font-semibold">{es ? 'Explorar catálogo' : 'Explore catalog'}</span><ArrowRight className="h-6 w-6 text-primary transition-transform group-hover:translate-x-1" /></Link></div></motion.section>
    </main>
    <Footer />
  </MacAppShell>;
}
