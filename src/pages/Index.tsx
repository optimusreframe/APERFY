import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import SignalBench from '@/components/motion/SignalBench';
import SignalRail from '@/components/landing/SignalRail';
import TrustInstrumentation from '@/components/landing/TrustInstrumentation';
import FindNarrative from '@/components/landing/FindNarrative';
import { useLanguage } from '@/i18n/LanguageContext';

export type HomepageCopy = { title: string; highlight: string; description: string; primaryCta: string; secondaryCta: string; catalogTitle: string; catalogDescription: string; searchPlaceholder: string; signalTitle: string; signalDescription: string; browseAll: string };

export function getHomepageCopy(locale: 'en' | 'es'): HomepageCopy {
  return locale === 'es'
    ? { title: 'Encuentra la señal', highlight: 'en el ruido.', description: 'Productos reales, valor verificable y cantidades limitadas. APERFY convierte una buena oportunidad en una compra que tiene sentido.', primaryCta: 'Explorar hallazgos', secondaryCta: 'Ver cómo funciona', catalogTitle: 'Señal actual', catalogDescription: 'Una selección que cambia cuando aparece algo que vale la pena.', searchPlaceholder: 'Buscar productos, categorías o marcas…', signalTitle: 'La claridad también es una ventaja', signalDescription: 'No necesitas navegar miles de opciones. Necesitas entender por qué esta oportunidad merece tu atención.', browseAll: 'Ver todo el catálogo' }
    : { title: 'Find the signal', highlight: 'in the noise.', description: 'Real products, verifiable value and limited quantities. APERFY turns a good opportunity into a buy that makes sense.', primaryCta: 'Explore current finds', secondaryCta: 'See how it works', catalogTitle: 'Current signal', catalogDescription: 'A changing selection for the moments when something is worth your attention.', searchPlaceholder: 'Search products, categories, or brands…', signalTitle: 'Clarity is an advantage', signalDescription: 'You do not need thousands of options. You need to understand why this opportunity deserves your attention.', browseAll: 'View the full catalog' };
}

type Product = { id: string; name_en: string; name_es: string; description_en?: string | null; [key: string]: unknown };

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
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter(product => `${product.name_en} ${product.name_es} ${product.description_en ?? ''}`.toLowerCase().includes(query));
  }, [products, search]);

  return <div className="min-h-screen bg-background">
    <Navbar />
    <main className="pt-24 sm:pt-28">
      <section className="relative overflow-hidden border-b border-border/70 bg-[hsl(150_20%_98%)] dark:bg-[hsl(160_24%_7%)]">
        <div className="absolute inset-0 aperfy-grid opacity-50" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-8 lg:py-24">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55 }}>
            <p className="max-w-xl text-5xl font-semibold leading-[.94] tracking-[-.055em] text-foreground sm:text-7xl">{copy.title}<br /><span className="text-primary">{copy.highlight}</span></p>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">{copy.description}</p>
            <div className="mt-9 flex flex-wrap gap-3"><Link to="/catalog" className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5">{copy.primaryCta}<ArrowRight className="h-4 w-4" /></Link><Link to="/our-process" className="inline-flex h-12 items-center gap-2 rounded-full border border-border bg-card px-6 font-semibold transition-colors hover:border-primary/40">{copy.secondaryCta}<ArrowUpRight className="h-4 w-4" /></Link></div>
            <div className="mt-10 flex items-center gap-3 text-xs text-muted-foreground"><span className="flex h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />{language === 'es' ? 'Una selección viva, no un catálogo infinito' : 'A living selection, not an endless catalog'}</div>
          </motion.div>
          <SignalBench locale={language} reducedMotionLabel={language === 'es' ? 'Movimiento reducido disponible' : 'Reduced motion supported'} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8"><TrustInstrumentation locale={language} /></section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8"><div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><h2 className="text-3xl font-semibold tracking-[-.04em] sm:text-5xl">{copy.catalogTitle}</h2><p className="mt-3 max-w-xl text-muted-foreground">{copy.catalogDescription}</p></div><div className="flex w-full gap-2 sm:w-auto"><div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={copy.searchPlaceholder} aria-label={copy.searchPlaceholder} className="h-11 w-full rounded-full border border-border bg-card pl-10 pr-4 outline-none transition-shadow focus:ring-2 focus:ring-primary/30" /></div><Link to="/catalog" aria-label={copy.browseAll} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"><SlidersHorizontal className="h-4 w-4" /></Link></div></div>
        {isLoading && <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl bg-muted" />)}</div>}
        {isError && <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-muted-foreground">{language === 'es' ? 'No pudimos cargar los hallazgos. Intenta de nuevo en unos segundos.' : 'We could not load the current finds. Try again in a few seconds.'}</div>}
        {!isLoading && !isError && visible.length > 0 && <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{visible.map((product, index) => <ProductCard key={product.id} product={product} index={index} showBadges />)}</div>}
        {!isLoading && !isError && visible.length === 0 && <div className="rounded-2xl border border-dashed border-border p-12 text-center"><Sparkles className="mx-auto h-6 w-6 text-primary" /><p className="mt-4 font-semibold">{language === 'es' ? 'Este filtro no encontró una señal clara.' : 'This filter did not find a clear signal.'}</p><p className="mt-2 text-sm text-muted-foreground">{language === 'es' ? 'Prueba otra búsqueda o vuelve cuando llegue el próximo hallazgo.' : 'Try another search or come back when the next find arrives.'}</p></div>}
        <div className="mt-8 text-center"><Link to="/catalog" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">{copy.browseAll}<ArrowRight className="h-4 w-4" /></Link></div>
      </section>

      <section className="border-y border-border/70 bg-secondary/40"><div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8"><div className="mb-10 flex items-end justify-between gap-4"><div><h2 className="text-3xl font-semibold tracking-[-.04em] sm:text-4xl">{copy.signalTitle}</h2><p className="mt-3 max-w-xl text-muted-foreground">{copy.signalDescription}</p></div></div><SignalRail locale={language} /></div></section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8"><FindNarrative locale={language} /></section>
    </main>
    <Footer />
  </div>;
}
