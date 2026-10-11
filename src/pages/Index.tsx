import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, Boxes, Check, ChevronDown, Grid2X2, List, Search, ShoppingBag, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import CatalogFiltersDialog, { type CatalogFilterSection } from '@/components/CatalogFiltersDialog';
import { useLanguage } from '@/i18n/LanguageContext';
import { getHomepageCopy } from './homepage-copy';
export { getHomepageCopy } from './homepage-copy';
import { DEFAULT_HOMEPAGE_HERO_CONFIG, HOMEPAGE_HERO_SETTING_KEY, parseHomepageHeroConfig } from '@/lib/homepage-settings';
import { fetchActiveStorefrontProducts, sortStorefrontProducts } from '@/lib/storefront-products';
import { DEFAULT_CATALOG_FILTERS, filterStorefrontProducts, getCatalogFilterFacets, type CatalogFilters, type CatalogFilterFacets } from '@/lib/storefront-filters';

const CATALOG_VIEW_STORAGE_KEY = 'aperfy-catalog-view';
const reveal = { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-10% 0px' }, transition: { duration: .4, ease: [0.2, 0, 1, 1] } } as const;

type CatalogView = 'grid' | 'list';

function readCatalogView(): CatalogView {
  if (typeof window === 'undefined') return 'grid';
  return window.localStorage.getItem(CATALOG_VIEW_STORAGE_KEY) === 'list' ? 'list' : 'grid';
}

type QuickFilterKey = 'category' | 'price' | 'availability' | 'sort';

function FilterChip({ active, children, onClick, icon, open, showChevron = true }: { active?: boolean; children: React.ReactNode; onClick: () => void; icon?: React.ReactNode; open?: boolean; showChevron?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-haspopup={showChevron ? 'listbox' : 'dialog'}
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${active ? 'border-primary/60 bg-primary/[0.1] text-primary' : 'border-border/80 bg-card/75 text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}
    >
      {icon}
      <span>{children}</span>
      {showChevron && <ChevronDown className={`h-3.5 w-3.5 opacity-70 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />}
    </button>
  );
}

type QuickFilterOption = { value: string; label: string; count: number };

function QuickFilterPanel({ title, options, selected, onSelect, resultCount }: { title: string; options: QuickFilterOption[]; selected: string; onSelect: (value: string) => void; resultCount: number }) {
  return (
    <div className="isolate rounded-2xl border border-border bg-card p-3 shadow-[0_18px_50px_hsl(var(--foreground)/.18)]" role="listbox" aria-label={title}>
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="text-[10px] uppercase tracking-[.16em] text-muted-foreground">{resultCount} resultados</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map(option => {
          const active = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => onSelect(option.value)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${active ? 'border-primary/70 bg-primary/[0.1] text-primary' : 'border-border bg-background text-foreground hover:border-primary/45 hover:bg-primary/[0.06]'}`}
            >
              {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              <span>{option.label}</span>
              <span className="text-[10px] tabular-nums text-muted-foreground">{option.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function facetOptions(facets: CatalogFilterFacets, key: QuickFilterKey, es: boolean, categories: [string, string][]): QuickFilterOption[] {
  if (key === 'category') {
    return facets.categories
      .filter(option => option.count > 0)
      .map(option => ({ value: option.value, count: option.count, label: option.value === 'all' ? (es ? 'Todas las categorías' : 'All categories') : categories.find(([value]) => value === option.value)?.[1] ?? option.value }));
  }
  if (key === 'price') {
    const labels: Record<string, string> = es ? { all: 'Cualquier precio', 'under-25': 'Menos de $25', '25-75': '$25–$75', 'over-75': 'Más de $75' } : { all: 'Any price', 'under-25': 'Under $25', '25-75': '$25–$75', 'over-75': 'Over $75' };
    return facets.price.filter(option => option.count > 0).map(option => ({ ...option, label: labels[option.value] }));
  }
  if (key === 'availability') {
    const labels: Record<string, string> = es ? { all: 'Toda disponibilidad', available: 'En stock', low: 'Quedan pocos', sold_out: 'Agotados', untracked: 'Sin seguimiento' } : { all: 'Any availability', available: 'In stock', low: 'Low stock', sold_out: 'Sold out', untracked: 'Untracked' };
    return facets.availability.filter(option => option.count > 0).map(option => ({ ...option, label: labels[option.value] }));
  }
  const labels: Record<string, string> = es ? { relevant: 'Más relevantes', new: 'Llegadas recientes', featured: 'Destacados', 'price-asc': 'Menor precio', 'price-desc': 'Mayor precio', 'name-asc': 'A–Z', 'name-desc': 'Z–A' } : { relevant: 'Most relevant', new: 'Newest arrivals', featured: 'Featured', 'price-asc': 'Lowest price', 'price-desc': 'Highest price', 'name-asc': 'A–Z', 'name-desc': 'Z–A' };
  return ['relevant', 'new', 'featured', 'price-asc', 'price-desc', 'name-asc', 'name-desc'].map(value => ({ value, label: labels[value], count: facets.resultCount }));
}

export default function Index() {
  const { language } = useLanguage();
  const { data: homepageHero = DEFAULT_HOMEPAGE_HERO_CONFIG } = useQuery({
    queryKey: ['homepage-hero-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('admin_settings').select('setting_value').eq('setting_key', HOMEPAGE_HERO_SETTING_KEY).maybeSingle();
      if (error) throw error;
      return parseHomepageHeroConfig(data?.setting_value);
    },
    staleTime: 60_000,
  });
  const copy = getHomepageCopy(language, homepageHero);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [filters, setFilters] = useState<CatalogFilters>(() => ({ ...DEFAULT_CATALOG_FILTERS }));
  const [draftFilters, setDraftFilters] = useState<CatalogFilters>(() => ({ ...DEFAULT_CATALOG_FILTERS }));
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filterDialogSection, setFilterDialogSection] = useState<CatalogFilterSection>('suggested');
  const [openQuickFilter, setOpenQuickFilter] = useState<QuickFilterKey | null>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<CatalogView>(readCatalogView);
  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ['aperfy-products'],
    queryFn: fetchActiveStorefrontProducts,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
  const es = language === 'es';

  useEffect(() => {
    window.localStorage.setItem(CATALOG_VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (!openQuickFilter) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!filterBarRef.current?.contains(event.target as Node)) setOpenQuickFilter(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenQuickFilter(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openQuickFilter]);

  const categories = useMemo(() => Array.from(new Map<string, string>(products.map(product => {
    const label = es ? product.categories?.name_es : product.categories?.name_en;
    return [product.categories?.slug || label || '', label || ''] as [string, string];
  }).filter(([value, label]) => Boolean(value && label))).entries()), [products, es]);

  const visible = useMemo(() => sortStorefrontProducts(filterStorefrontProducts(products, deferredSearch, filters), filters.sorting, language), [products, deferredSearch, filters, language]);
  const quickFacets = useMemo(() => getCatalogFilterFacets(products, deferredSearch, filters), [products, deferredSearch, filters]);
  const draftFacets = useMemo(() => getCatalogFilterFacets(products, deferredSearch, draftFilters), [products, deferredSearch, draftFilters]);
  const draftResultCount = draftFacets.resultCount;
  const gridClassName = viewMode === 'grid' ? 'grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-4' : 'grid gap-3 sm:gap-4';
  const activeFilterCount = [
    filters.category !== 'all',
    filters.price !== 'all',
    filters.availability !== 'all',
    filters.condition !== 'all',
    filters.featuredOnly,
  ].filter(Boolean).length;
  const categoryLabel = categories.find(([value]) => value === filters.category)?.[1] ?? (es ? 'Categorías' : 'Categories');
  const priceLabel = filters.price === 'under-25' ? (es ? 'Menos de $25' : 'Under $25') : filters.price === '25-75' ? '$25–$75' : filters.price === 'over-75' ? (es ? 'Más de $75' : 'Over $75') : (es ? 'Precio' : 'Price');
  const availabilityLabel = filters.availability === 'available' ? (es ? 'En stock' : 'In stock') : filters.availability === 'low' ? (es ? 'Quedan pocos' : 'Low stock') : filters.availability === 'sold_out' ? (es ? 'Agotados' : 'Sold out') : filters.availability === 'untracked' ? (es ? 'Sin seguimiento' : 'Untracked') : (es ? 'Disponibilidad' : 'Availability');
  const sortLabel = filters.sorting === 'new' ? (es ? 'Nuevos' : 'Newest') : filters.sorting === 'featured' ? (es ? 'Destacados' : 'Featured') : filters.sorting === 'price-asc' ? (es ? 'Menor precio' : 'Lowest price') : filters.sorting === 'price-desc' ? (es ? 'Mayor precio' : 'Highest price') : filters.sorting === 'name-asc' ? 'A–Z' : filters.sorting === 'name-desc' ? 'Z–A' : (es ? 'Más relevantes' : 'Most relevant');

  const openFilters = (section: CatalogFilterSection = 'suggested') => {
    setOpenQuickFilter(null);
    setDraftFilters({ ...filters });
    setFilterDialogSection(section);
    setFilterDialogOpen(true);
  };

  const handleFilterDialogChange = (open: boolean) => {
    if (!open) setDraftFilters({ ...filters });
    setFilterDialogOpen(open);
  };

  const applyDraftFilters = () => {
    setFilters({ ...draftFilters });
    setFilterDialogOpen(false);
  };

  const clearDraftFilters = () => setDraftFilters({ ...DEFAULT_CATALOG_FILTERS });

  return <>
    <main className="min-w-0">
      {homepageHero.enabled && <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .35 }} className="border-b border-border/70 bg-card/45">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-7 sm:px-8 xl:flex-row xl:items-center xl:justify-between xl:px-12">
          <div className="min-w-0 flex-1 xl:max-w-4xl"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.2em] text-primary">{copy.eyebrow}</p><h1 className="aperfy-display-title max-w-none break-words text-4xl font-semibold leading-[.98] tracking-[-.06em] sm:text-6xl">{copy.title} <span className="text-primary">{copy.highlight}</span></h1><p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">{copy.description}</p></div>
          <div className="flex shrink-0 flex-wrap gap-2"><Link to="#deals" className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5">{copy.heroPrimaryCta}<ArrowRight className="h-4 w-4" /></Link><Link to="/ask" className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold transition-colors hover:border-primary/50">{copy.heroSecondaryCta}</Link></div>
        </div>
      </motion.section>}

      <motion.section {...reveal} id="deals" className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
        <div className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-primary"><ShoppingBag className="h-4 w-4" />{es ? 'Tienda en vivo' : 'Live storefront'}</div><h2 className="text-3xl font-semibold tracking-[-.045em] sm:text-5xl">{copy.catalogTitle}</h2><p className="mt-3 max-w-xl text-muted-foreground">{copy.catalogDescription}</p></div>
          <div className="w-full xl:w-[min(100%,42rem)]">
            <div className="relative w-full"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={copy.searchPlaceholder} aria-label={copy.searchPlaceholder} className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 outline-none transition-shadow focus:ring-2 focus:ring-primary/30" /></div>
            <div ref={filterBarRef} className="relative mt-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label={es ? 'Filtros del catálogo' : 'Catalog filters'}>
                  <FilterChip active={activeFilterCount > 0} onClick={() => openFilters('suggested')} showChevron={false} icon={<SlidersHorizontal className="h-3.5 w-3.5" />}>{es ? 'Más filtros' : 'More filters'}{activeFilterCount > 0 && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">{activeFilterCount}</span>}</FilterChip>
                  <FilterChip active={filters.category !== 'all'} open={openQuickFilter === 'category'} onClick={() => setOpenQuickFilter(openQuickFilter === 'category' ? null : 'category')}>{categoryLabel}</FilterChip>
                  <FilterChip active={filters.price !== 'all'} open={openQuickFilter === 'price'} onClick={() => setOpenQuickFilter(openQuickFilter === 'price' ? null : 'price')}>{priceLabel}</FilterChip>
                  <FilterChip active={filters.availability !== 'all'} open={openQuickFilter === 'availability'} onClick={() => setOpenQuickFilter(openQuickFilter === 'availability' ? null : 'availability')}>{availabilityLabel}</FilterChip>
                  <FilterChip active={filters.sorting !== 'relevant'} open={openQuickFilter === 'sort'} onClick={() => setOpenQuickFilter(openQuickFilter === 'sort' ? null : 'sort')}>{sortLabel}</FilterChip>
                </div>
                <div role="group" aria-label={es ? 'Vista del catálogo' : 'Catalog view'} className="flex shrink-0 items-center rounded-full border border-border/80 bg-card/75 p-0.5">
                <button type="button" onClick={() => setViewMode('grid')} aria-pressed={viewMode === 'grid'} aria-label={es ? 'Vista de cuadrícula' : 'Grid view'} className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}><Grid2X2 className="h-3.5 w-3.5" aria-hidden="true" /></button>
                <button type="button" onClick={() => setViewMode('list')} aria-pressed={viewMode === 'list'} aria-label={es ? 'Vista de lista' : 'List view'} className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}><List className="h-4 w-4" aria-hidden="true" /></button>
                </div>
              </div>
              {openQuickFilter && <div className="absolute inset-x-0 top-full z-40 mt-2"><QuickFilterPanel title={openQuickFilter === 'category' ? (es ? 'Categorías' : 'Categories') : openQuickFilter === 'price' ? (es ? 'Precio' : 'Price') : openQuickFilter === 'availability' ? (es ? 'Disponibilidad' : 'Availability') : (es ? 'Ordenar por' : 'Sort by')} options={facetOptions(quickFacets, openQuickFilter, es, categories)} selected={openQuickFilter === 'category' ? filters.category : openQuickFilter === 'price' ? filters.price : openQuickFilter === 'availability' ? filters.availability : filters.sorting} resultCount={quickFacets.resultCount} onSelect={value => { setFilters(current => ({ ...current, [openQuickFilter === 'category' ? 'category' : openQuickFilter === 'price' ? 'price' : openQuickFilter === 'availability' ? 'availability' : 'sorting']: value } as CatalogFilters)); setOpenQuickFilter(null); }} /></div>}
            </div>
          </div>
        </div>

        {isLoading && <div className={gridClassName}>{Array.from({ length: 8 }).map((_, index) => <div key={index} className={`${viewMode === 'grid' ? 'aspect-[4/5]' : 'h-40'} animate-pulse rounded-2xl bg-muted`} />)}</div>}
        {isError && <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-muted-foreground">{es ? 'No pudimos cargar las ofertas disponibles. Intenta de nuevo en unos segundos.' : 'We could not load available deals. Try again in a few seconds.'}</div>}
        {!isLoading && !isError && visible.length > 0 && <div className={gridClassName}>{visible.map((product, index) => <ProductCard key={product.id} product={product} index={index} layout={viewMode} showBadges />)}</div>}
        {!isLoading && !isError && visible.length === 0 && <div className="rounded-2xl border border-dashed border-border p-12 text-center"><Boxes className="mx-auto h-6 w-6 text-primary" /><p className="mt-4 font-semibold">{es ? 'No hay ofertas con esos filtros.' : 'No deals match those filters.'}</p><p className="mt-2 text-sm text-muted-foreground">{es ? 'Prueba otra búsqueda o solicita un producto específico.' : 'Try another search or request a specific product.'}</p><Link to="/ask" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">{copy.secondaryCta}<ArrowRight className="h-4 w-4" /></Link></div>}
        <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><SlidersHorizontal className="h-3.5 w-3.5 text-primary" />{visible.length} {es ? 'ofertas visibles · stock real y limitado' : 'visible deals · real and limited stock'}{activeFilterCount > 0 && <span className="text-primary">· {activeFilterCount} {es ? 'filtros activos' : 'active filters'}</span>}</p>
      </motion.section>

      <motion.section {...reveal} className="border-y border-border/70 bg-secondary/35"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-10 sm:px-8 xl:flex-row xl:items-center xl:justify-between xl:px-12"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">{es ? '¿Buscas algo concreto?' : 'Looking for something specific?'}</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">{es ? 'Pídenos que lo encontremos.' : 'Ask us to find it.'}</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{es ? 'Déjanos los detalles y te avisaremos si conseguimos una oferta para publicarla en APERFY.' : 'Share the details and we will let you know if we find a deal worth publishing on APERFY.'}</p></div><Link to="/ask" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/[0.08] px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/[0.14]">{copy.secondaryCta}<ArrowRight className="h-4 w-4" /></Link></div></motion.section>
      <CatalogFiltersDialog
        open={filterDialogOpen}
        onOpenChange={handleFilterDialogChange}
        filters={draftFilters}
        onFiltersChange={setDraftFilters}
        onApply={applyDraftFilters}
        onClear={clearDraftFilters}
        categories={categories}
        facets={draftFacets}
        resultCount={draftResultCount}
        language={language}
        initialSection={filterDialogSection}
      />
    </main>
    <Footer />
  </>;
}
