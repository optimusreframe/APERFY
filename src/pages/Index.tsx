import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, Search, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { useLanguage } from '@/i18n/LanguageContext';

type Product = { id: string; name_en: string; name_es: string; description_en?: string | null; [key: string]: unknown };

export default function Index() {
  const { language } = useLanguage();
  const [search, setSearch] = useState('');
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['aperfy-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*, categories(id, name_en, name_es, slug)').eq('is_active', true).order('created_at', { ascending: false }).limit(12);
      if (error) throw error;
      return data ?? [];
    },
  });
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((p: Product) => `${p.name_en} ${p.name_es} ${p.description_en ?? ''}`.toLowerCase().includes(query));
  }, [products, search]);
  const copy = language === 'es' ? {
    eyebrow: 'Curated finds · Verified value', title: 'Encuentra algo', highlight: 'perfecto para ti.', desc: 'Productos reales, cantidades limitadas y precios verificados. Andrés encuentra la oportunidad; APERFY la convierte en una compra inteligente.', explore: 'Explorar catálogo', how: 'Cómo funciona', search: 'Buscar productos, categorías o marcas…', latest: 'Últimos hallazgos', latestDesc: 'Una selección cambiante, elegida por valor y utilidad.', empty: 'Todavía estamos preparando nuevos hallazgos.'
  } : {
    eyebrow: 'Curated finds · Verified value', title: 'Find something', highlight: 'perfect for you.', desc: 'Real products, limited quantities, and verified value. Andrés finds the opportunity; APERFY turns it into a smarter buy.', explore: 'Explore the catalog', how: 'How it works', search: 'Search products, categories, or brands…', latest: 'Latest finds', latestDesc: 'A changing selection chosen for value and usefulness.', empty: 'We are preparing the next perfect finds.'
  };
  return <div className="min-h-screen bg-background">
    <Navbar />
    <main className="pt-24 sm:pt-28">
      <section className="aperfy-gradient aperfy-grid relative overflow-hidden border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55 }} className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[.16em] text-primary"><Sparkles className="w-3.5 h-3.5" /> {copy.eyebrow}</div>
            <h1 className="mt-6 text-5xl sm:text-7xl font-semibold tracking-[-.06em] leading-[.95]">{copy.title}<br /><span className="text-primary">{copy.highlight}</span></h1>
            <p className="mt-7 max-w-xl text-lg sm:text-xl leading-relaxed text-muted-foreground">{copy.desc}</p>
            <div className="mt-9 flex flex-wrap gap-3"><Link to="/catalog" className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground shadow-gold hover:-translate-y-0.5 transition-transform">{copy.explore}<ArrowRight className="w-4 h-4" /></Link><Link to="/our-process" className="inline-flex h-12 items-center rounded-full border border-border bg-card/70 px-6 font-semibold hover:bg-card transition-colors">{copy.how}</Link></div>
          </motion.div>
          <img src="/brand/aperfy-logo.png" alt="APERFY" className="absolute -right-20 bottom-[-180px] hidden md:block w-[560px] opacity-20 blur-[1px]" />
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid gap-3 sm:grid-cols-3 mb-12"><div className="aperfy-glass rounded-2xl p-5"><ShieldCheck className="w-5 h-5 text-primary mb-3" /><h3 className="font-semibold">{language === 'es' ? 'Valor verificado' : 'Verified value'}</h3><p className="mt-1 text-sm text-muted-foreground">{language === 'es' ? 'Referencias de precio documentadas.' : 'Documented reference pricing.'}</p></div><div className="aperfy-glass rounded-2xl p-5"><Sparkles className="w-5 h-5 text-primary mb-3" /><h3 className="font-semibold">{language === 'es' ? 'Selección humana' : 'Human curation'}</h3><p className="mt-1 text-sm text-muted-foreground">{language === 'es' ? 'Cada hallazgo tiene un porqué.' : 'Every find has a reason.'}</p></div><div className="aperfy-glass rounded-2xl p-5"><Truck className="w-5 h-5 text-primary mb-3" /><h3 className="font-semibold">{language === 'es' ? 'Compra conversacional' : 'Conversational checkout'}</h3><p className="mt-1 text-sm text-muted-foreground">{language === 'es' ? 'Ordena primero; confirma por WhatsApp.' : 'Place an order; confirm via WhatsApp.'}</p></div></div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5"><div><p className="text-sm font-semibold uppercase tracking-[.16em] text-primary">APERFY / 01</p><h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">{copy.latest}</h2><p className="mt-2 text-muted-foreground">{copy.latestDesc}</p></div><div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={copy.search} className="h-11 w-full rounded-full border border-border bg-card pl-10 pr-4 outline-none focus:ring-2 focus:ring-primary/30" /></div></div>
        {isLoading ? <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-7">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-muted" />)}</div> : visible.length ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-7">{visible.map((p: Product, i: number) => <ProductCard key={p.id} product={p} index={i} showBadges />)}</div> : <div className="py-20 text-center text-muted-foreground">{copy.empty}</div>}
      </section>
    </main>
    <Footer />
  </div>;
}
