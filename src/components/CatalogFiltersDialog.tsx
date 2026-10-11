import { useEffect, useState } from 'react';
import { Check, ChevronRight, PackageCheck, SlidersHorizontal, Sparkles, Star, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { CatalogConditionFilter, CatalogFilterFacets, CatalogFilters, CatalogPriceFilter } from '@/lib/storefront-filters';
import type { InventoryState } from '@/lib/inventory';
import type { StorefrontSort } from '@/lib/storefront-products';

export type CatalogFilterSection = 'suggested' | 'availability' | 'condition' | 'category' | 'price' | 'sort';

type CatalogFiltersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: CatalogFilters;
  onFiltersChange: (filters: CatalogFilters) => void;
  onApply: () => void;
  onClear: () => void;
  categories: [string, string][];
  facets: CatalogFilterFacets;
  resultCount: number;
  language: 'es' | 'en';
  initialSection?: CatalogFilterSection;
};

const sections: { id: CatalogFilterSection; label: { es: string; en: string }; icon: typeof SlidersHorizontal }[] = [
  { id: 'suggested', label: { es: 'Sugeridos', en: 'Suggested' }, icon: Sparkles },
  { id: 'availability', label: { es: 'Disponibilidad', en: 'Availability' }, icon: PackageCheck },
  { id: 'condition', label: { es: 'Condición', en: 'Condition' }, icon: Tag },
  { id: 'category', label: { es: 'Categorías', en: 'Categories' }, icon: SlidersHorizontal },
  { id: 'price', label: { es: 'Precio', en: 'Price' }, icon: Star },
  { id: 'sort', label: { es: 'Ordenar por', en: 'Sort by' }, icon: ChevronRight },
];

function OptionButton({ active, children, count, onClick }: { active: boolean; children: React.ReactNode; count?: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        active ? 'border-primary/70 bg-primary/12 text-primary shadow-[0_0_0_1px_hsl(var(--primary)/.14)]' : 'border-border bg-card/70 text-foreground hover:border-primary/40 hover:bg-primary/[0.06]',
      )}
    >
      {active && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      <span>{children}</span>
      {count !== undefined && <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">{count}</span>}
    </button>
  );
}

function optionLabel(language: 'es' | 'en', es: string, en: string) {
  return language === 'es' ? es : en;
}

export default function CatalogFiltersDialog({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  onApply,
  onClear,
  categories,
  facets,
  resultCount,
  language,
  initialSection = 'suggested',
}: CatalogFiltersDialogProps) {
  const [activeSection, setActiveSection] = useState<CatalogFilterSection>(initialSection);
  const es = language === 'es';

  const visibleSections = sections.filter(section => {
    if (section.id === 'suggested') return facets.suggested.featuredCount > 0 || facets.suggested.availableCount > 0 || facets.suggested.newCount > 0 || filters.featuredOnly || filters.availability === 'available' || filters.condition === 'new';
    if (section.id === 'availability') return facets.availability.some(option => option.value !== 'all' && (option.count > 0 || filters.availability === option.value)) || filters.availability !== 'all';
    if (section.id === 'condition') return facets.condition.some(option => option.value !== 'all' && (option.count > 0 || filters.condition === option.value)) || filters.condition !== 'all';
    if (section.id === 'category') return facets.categories.some(option => option.value !== 'all' && (option.count > 0 || filters.category === option.value)) || filters.category !== 'all';
    if (section.id === 'price') return facets.price.some(option => option.value !== 'all' && (option.count > 0 || filters.price === option.value)) || filters.price !== 'all';
    return resultCount > 0 || filters.sorting !== 'relevant';
  });

  useEffect(() => {
    if (open) setActiveSection(initialSection);
  }, [initialSection, open]);

  useEffect(() => {
    if (open && !visibleSections.some(section => section.id === activeSection)) {
      setActiveSection(visibleSections[0]?.id ?? 'suggested');
    }
  }, [activeSection, open, visibleSections]);

  const update = <K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const sortOptions: [StorefrontSort, string, string][] = [
    ['relevant', 'Más relevantes', 'Most relevant'],
    ['new', 'Llegadas recientes', 'Newest arrivals'],
    ['featured', 'Destacados', 'Featured'],
    ['price-asc', 'Precio: menor a mayor', 'Price: low to high'],
    ['price-desc', 'Precio: mayor a menor', 'Price: high to low'],
    ['name-asc', 'Nombre: A–Z', 'Name: A–Z'],
    ['name-desc', 'Nombre: Z–A', 'Name: Z–A'],
  ];

  const sectionTitle = sections.find(section => section.id === activeSection)?.label[language] ?? (es ? 'Filtros' : 'Filters');
  const selectedSectionCount = activeSection === 'suggested'
    ? Number(filters.featuredOnly) + Number(filters.availability === 'available') + Number(filters.condition === 'new')
    : activeSection === 'availability'
      ? Number(filters.availability !== 'all')
      : activeSection === 'condition'
        ? Number(filters.condition !== 'all')
        : activeSection === 'category'
          ? Number(filters.category !== 'all')
          : activeSection === 'price'
            ? Number(filters.price !== 'all')
            : Number(filters.sorting !== 'relevant');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-dvh max-h-dvh w-full max-w-4xl flex-col gap-0 rounded-none border-border/70 bg-background/98 p-0 sm:h-[min(760px,calc(100dvh-2rem))] sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border/70 px-4 py-4 pr-14 sm:px-6">
          <div>
            <DialogTitle className="text-xl tracking-[-.03em]">{es ? 'Filtros' : 'Filters'}</DialogTitle>
            <DialogDescription className="mt-1 text-xs">{es ? 'Ajusta el catálogo a lo que buscas.' : 'Shape the catalog around what you need.'}</DialogDescription>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <nav aria-label={es ? 'Secciones de filtros' : 'Filter sections'} className="w-[8.5rem] shrink-0 overflow-y-auto border-r border-border/70 bg-card/35 sm:w-48">
            {visibleSections.map(section => {
              const Icon = section.icon;
              const active = activeSection === section.id;
              const sectionCount = section.id === 'suggested'
                ? Number(filters.featuredOnly) + Number(filters.availability === 'available') + Number(filters.condition === 'new')
                : section.id === 'availability'
                  ? Number(filters.availability !== 'all')
                  : section.id === 'condition'
                    ? Number(filters.condition !== 'all')
                    : section.id === 'category'
                      ? Number(filters.category !== 'all')
                      : section.id === 'price'
                        ? Number(filters.price !== 'all')
                        : Number(filters.sorting !== 'relevant');
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'flex min-h-14 w-full items-center gap-2 border-l-2 px-3 text-left text-xs font-medium transition-colors sm:px-4 sm:text-sm',
                    active ? 'border-primary bg-primary/[0.08] text-primary' : 'border-transparent text-muted-foreground hover:bg-card hover:text-foreground',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="leading-tight">{section.label[language]}</span>
                  {sectionCount > 0 && <span className="ml-auto min-w-4 text-right text-[10px] tabular-nums text-primary">{sectionCount}</span>}
                </button>
              );
            })}
          </nav>

          <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-primary">{es ? 'Explorar' : 'Explore'}</p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-.03em]">{sectionTitle}{selectedSectionCount > 0 && <span className="ml-2 text-sm font-medium text-primary">({selectedSectionCount})</span>}</h2>
              </div>
              {activeSection !== 'suggested' && <button type="button" onClick={onClear} className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-primary hover:underline">{es ? 'Limpiar' : 'Clear'}</button>}
            </div>

            {activeSection === 'suggested' && (
              <div className="space-y-5">
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{es ? 'Atajos para encontrar rápidamente productos destacados y disponibles.' : 'Shortcuts for finding featured products that are ready to buy.'}</p>
                <div className="flex flex-wrap gap-2.5">
                  {(facets.suggested.featuredCount > 0 || filters.featuredOnly) && <OptionButton active={filters.featuredOnly} count={facets.suggested.featuredCount} onClick={() => update('featuredOnly', !filters.featuredOnly)}>{es ? 'Destacados' : 'Featured'}</OptionButton>}
                  {(facets.suggested.availableCount > 0 || filters.availability === 'available') && <OptionButton active={filters.availability === 'available'} count={facets.suggested.availableCount} onClick={() => update('availability', filters.availability === 'available' ? 'all' : 'available')}>{es ? 'En stock' : 'In stock'}</OptionButton>}
                  {(facets.suggested.newCount > 0 || filters.condition === 'new') && <OptionButton active={filters.condition === 'new'} count={facets.suggested.newCount} onClick={() => update('condition', filters.condition === 'new' ? 'all' : 'new')}>{es ? 'Nuevos' : 'New'}</OptionButton>}
                </div>
              </div>
            )}

            {activeSection === 'availability' && (
              <div className="flex flex-wrap gap-2.5">
                {([['all', 'Toda disponibilidad', 'Any availability'], ['available', 'En stock', 'In stock'], ['low', 'Quedan pocos', 'Low stock'], ['sold_out', 'Agotados', 'Sold out'], ['untracked', 'Sin seguimiento', 'Untracked']] as [CatalogFilters['availability'], string, string][]).map(([value, esLabel, enLabel]) => {
                  const option = facets.availability.find(candidate => candidate.value === value);
                  if (!option || (value !== 'all' && option.count === 0 && filters.availability !== value) || (value === 'all' && option.count === 0 && filters.availability !== 'all')) return null;
                  return <OptionButton key={value} active={filters.availability === value} count={option.count} onClick={() => update('availability', value)}>{optionLabel(language, esLabel, enLabel)}</OptionButton>;
                })}
              </div>
            )}

            {activeSection === 'condition' && (
              <div className="flex flex-wrap gap-2.5">
                {([['all', 'Todas', 'All'], ['new', 'Nuevo', 'New'], ['used', 'Usado', 'Used']] as [CatalogConditionFilter, string, string][]).map(([value, esLabel, enLabel]) => {
                  const option = facets.condition.find(candidate => candidate.value === value);
                  if (!option || option.count === 0 && filters.condition !== value) return null;
                  return <OptionButton key={value} active={filters.condition === value} count={option.count} onClick={() => update('condition', value)}>{optionLabel(language, esLabel, enLabel)}</OptionButton>;
                })}
              </div>
            )}

            {activeSection === 'category' && (
              <div className="flex flex-wrap gap-2.5">
                {facets.categories.map(option => {
                  const label = option.value === 'all' ? (es ? 'Todas las categorías' : 'All categories') : categories.find(([value]) => value === option.value)?.[1];
                  if (!label || option.count === 0 && filters.category !== option.value) return null;
                  return <OptionButton key={option.value} active={filters.category === option.value} count={option.count} onClick={() => update('category', option.value)}>{label}</OptionButton>;
                })}
              </div>
            )}

            {activeSection === 'price' && (
              <div className="flex flex-wrap gap-2.5">
                {([['all', 'Cualquier precio', 'Any price'], ['under-25', 'Menos de $25', 'Under $25'], ['25-75', '$25–$75', '$25–$75'], ['over-75', 'Más de $75', 'Over $75']] as [CatalogPriceFilter, string, string][]).map(([value, esLabel, enLabel]) => {
                  const option = facets.price.find(candidate => candidate.value === value);
                  if (!option || option.count === 0 && filters.price !== value) return null;
                  return <OptionButton key={value} active={filters.price === value} count={option.count} onClick={() => update('price', value)}>{optionLabel(language, esLabel, enLabel)}</OptionButton>;
                })}
              </div>
            )}

            {activeSection === 'sort' && (
              <div className="grid max-w-xl gap-2.5">
                {sortOptions.map(([value, esLabel, enLabel]) => <OptionButton key={value} active={filters.sorting === value} onClick={() => update('sorting', value)}>{optionLabel(language, esLabel, enLabel)}</OptionButton>)}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border/70 bg-card/55 px-4 py-3 backdrop-blur-xl sm:px-6">
          <button type="button" onClick={onClear} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">{es ? 'Restablecer' : 'Reset'}<span className="sr-only">{es ? ' todos los filtros' : ' all filters'}</span></button>
          <button type="button" onClick={onApply} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5 sm:flex-none">{es ? `Mostrar ${resultCount} resultados` : `Show ${resultCount} results`}</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
