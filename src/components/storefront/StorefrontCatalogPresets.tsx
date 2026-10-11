import type { Dispatch, SetStateAction } from 'react';
import { ArrowRight, ChevronRight, Grid2X2, List, Search, SlidersHorizontal, Sparkles, Truck, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductCard, { type ProductCardProduct } from '@/components/ProductCard';
import StorefrontProductTile from './StorefrontProductTile';
import type { CatalogFilterSection } from '@/components/CatalogFiltersDialog';
import type { CatalogFilters } from '@/lib/storefront-filters';
import type { StorefrontProduct } from '@/lib/storefront-products';

type CatalogView = 'grid' | 'list';

interface PresetControlsProps {
  es: boolean;
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  searchPlaceholder: string;
  openFilters: (section?: CatalogFilterSection) => void;
  activeFilterCount: number;
  categoryLabel: string;
  priceLabel: string;
  availabilityLabel: string;
  sortLabel: string;
  viewMode: CatalogView;
  setViewMode: Dispatch<SetStateAction<CatalogView>>;
}

interface CatalogPresetProps extends PresetControlsProps {
  copy: { title: string; highlight: string; description: string; catalogTitle: string; catalogDescription: string; heroPrimaryCta: string; secondaryCta: string };
  products: StorefrontProduct[];
  visible: StorefrontProduct[];
  categories: [string, string][];
}

function PresetControls({ es, search, setSearch, searchPlaceholder, openFilters, activeFilterCount, categoryLabel, priceLabel, availabilityLabel, sortLabel, viewMode, setViewMode }: PresetControlsProps) {
  return (
    <div className="storefront-preset-controls">
      <div className="storefront-preset-search">
        <Search className="h-4 w-4" aria-hidden="true" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
      </div>
      <div className="storefront-preset-control-row">
        <button type="button" onClick={() => openFilters('suggested')} className="storefront-preset-filter-button"><SlidersHorizontal className="h-4 w-4" />{es ? 'Más filtros' : 'More filters'}{activeFilterCount > 0 && <span>{activeFilterCount}</span>}</button>
        <button type="button" onClick={() => openFilters('category')} className="storefront-preset-filter-button">{categoryLabel}<ChevronRight className="h-3.5 w-3.5 rotate-90" /></button>
        <button type="button" onClick={() => openFilters('price')} className="storefront-preset-filter-button">{priceLabel}<ChevronRight className="h-3.5 w-3.5 rotate-90" /></button>
        <button type="button" onClick={() => openFilters('availability')} className="storefront-preset-filter-button hidden sm:inline-flex">{availabilityLabel}<ChevronRight className="h-3.5 w-3.5 rotate-90" /></button>
        <button type="button" onClick={() => openFilters('sort')} className="storefront-preset-filter-button hidden md:inline-flex">{sortLabel}<ChevronRight className="h-3.5 w-3.5 rotate-90" /></button>
        <div className="storefront-preset-view-toggle" role="group" aria-label={es ? 'Vista del catálogo' : 'Catalog view'}>
          <button type="button" onClick={() => setViewMode('grid')} aria-pressed={viewMode === 'grid'}><Grid2X2 className="h-4 w-4" /></button>
          <button type="button" onClick={() => setViewMode('list')} aria-pressed={viewMode === 'list'}><List className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}

function FeatureImage({ product, className = '' }: { product?: StorefrontProduct; className?: string }) {
  const image = product && Array.isArray(product.images) ? product.images.find((item): item is string => typeof item === 'string') : undefined;
  if (!product || !image) return <div className={`storefront-feature-placeholder ${className}`}><Sparkles className="h-8 w-8" /></div>;
  return <img className={className} src={image} alt={product.name_en} loading="eager" decoding="async" />;
}

export function TechCatalogPreset({ copy, es, products, visible, categories, ...controls }: CatalogPresetProps) {
  const featured = products[0];
  const bestSellers = visible.slice(0, 6);
  return (
    <main data-storefront-layout="design2" className="storefront-preset storefront-design2">
      <section className="design2-hero">
        <div className="design2-hero-copy">
          <p className="design2-eyebrow">APERFY · {es ? 'ACCESORIOS TECH' : 'TECH ACCESSORIES'}</p>
          <h1>{es ? 'Tecnología que se adapta a tu ritmo.' : 'Technology that moves with you.'}</h1>
          <p>{es ? 'Descubre piezas útiles, originales y listas para acompañarte todos los días.' : 'Discover useful, original pieces ready to move with you every day.'}</p>
          <Link to="#design2-best-sellers" className="design2-hero-cta">{copy.heroPrimaryCta}<ArrowRight className="h-4 w-4" /></Link>
          <div className="design2-service-note"><Truck className="h-4 w-4" /><span>{es ? 'Envío rápido · stock verificado' : 'Fast delivery · verified stock'}</span></div>
        </div>
        <Link to={featured ? `/products/${featured.slug}` : '#design2-best-sellers'} className="design2-hero-product">
          <FeatureImage product={featured} />
          <div className="design2-hero-product-copy"><span>{es ? 'DESTACADO' : 'FEATURED'}</span><strong>{featured ? (es ? featured.name_es : featured.name_en) : copy.highlight}</strong><b>{es ? 'Ver producto' : 'View product'} <ArrowRight className="h-4 w-4" /></b></div>
        </Link>
      </section>

      <section className="design2-category-section" aria-label={es ? 'Categorías' : 'Categories'}>
        <div className="design2-section-heading"><div><p>{es ? 'EXPLORA' : 'EXPLORE'}</p><h2>{es ? 'Compra por categoría' : 'Shop by category'}</h2></div><span>{categories.length.toString().padStart(2, '0')}</span></div>
        <div className="design2-category-rail">
          {categories.slice(0, 6).map(([slug, label], index) => {
            const categoryProduct = products.find((product) => product.categories?.slug === slug);
            return <Link key={slug} to={`/?category=${slug}`} className="design2-category-chip"><FeatureImage product={categoryProduct} /><span>{label}</span><small>{String(index + 1).padStart(2, '0')}</small></Link>;
          })}
        </div>
      </section>

      <section id="design2-best-sellers" className="design2-products-section">
        <div className="design2-section-heading"><div><p>{es ? 'SELECCIÓN APERFY' : 'APERFY SELECTION'}</p><h2>{es ? 'Más buscados' : 'Best sellers'}</h2></div><span>{visible.length.toString().padStart(2, '0')} {es ? 'ITEMS' : 'ITEMS'}</span></div>
        <PresetControls es={es} {...controls} />
        <div className="design2-products-list">{bestSellers.length > 0 ? bestSellers.map((product, index) => <ProductCard key={product.id} product={product} index={index} layout={controls.viewMode === 'list' ? 'list' : 'grid'} showBadges />) : <p className="storefront-preset-empty">{es ? 'No hay productos con esos filtros.' : 'No products match these filters.'}</p>}</div>
      </section>
    </main>
  );
}

export function LuxuryCatalogPreset({ copy, es, products, visible, categories, ...controls }: CatalogPresetProps) {
  const hero = products[0];
  const categoryProducts = categories.slice(0, 5).map(([slug, label]) => ({ slug, label, product: products.find((product) => product.categories?.slug === slug) }));
  return (
    <main data-storefront-layout="design3" className="storefront-preset storefront-design3">
      <section className="design3-hero">
        <div className="design3-hero-copy"><p className="design3-kicker">APERFY · {es ? 'SELECCIÓN PRIVADA' : 'PRIVATE SELECTION'}</p><h1>{es ? 'Encuentra algo que se sienta tuyo.' : 'Find something that feels like yours.'}</h1><p>{es ? 'Objetos elegidos con intención, presentados con espacio para descubrirlos.' : 'Objects chosen with intention, presented with room to discover them.'}</p><Link to="#design3-collection" className="design3-link">{es ? 'Ver colección' : 'View collection'}<ArrowRight className="h-4 w-4" /></Link></div><Link to={hero ? `/products/${hero.slug}` : '#design3-collection'} className="design3-hero-image"><FeatureImage product={hero} /><div className="design3-hero-label"><span>{hero?.brand || 'APERFY'}</span><strong>{hero ? (es ? hero.name_es : hero.name_en) : copy.highlight}</strong></div></Link>
      </section>
      <section className="design3-category-section"><div className="design3-section-heading"><p>{es ? 'DESCUBRE POR CATEGORÍA' : 'DISCOVER BY CATEGORY'}</p><h2>{es ? 'Una colección para cada momento.' : 'A collection for every moment.'}</h2></div><div className="design3-category-rail">{categoryProducts.map(({ slug, label, product }) => <Link key={slug} to={`/?category=${slug}`} className="design3-category-item"><FeatureImage product={product} /><span>{label}</span></Link>)}</div></section>
      <section id="design3-collection" className="design3-collection"><div className="design3-section-heading design3-collection-heading"><div><p>{es ? 'CURATED NOW' : 'CURATED NOW'}</p><h2>{es ? 'Piezas destacadas' : 'Featured pieces'}</h2></div><PresetControls es={es} {...controls} /></div><div className={`design3-products ${controls.viewMode === 'list' ? 'is-list' : ''}`}>{visible.length > 0 ? visible.map((product, index) => <StorefrontProductTile key={product.id} product={product} index={index} variant="luxury" />) : <p className="storefront-preset-empty">{es ? 'No hay productos con esos filtros.' : 'No products match these filters.'}</p>}</div></section>
    </main>
  );
}

export function DropsCatalogPreset({ copy, es, products, visible, categories, ...controls }: CatalogPresetProps) {
  const brands = Array.from(new Set(products.map((product) => product.brand).filter((brand): brand is string => Boolean(brand)))).slice(0, 6);
  const hero = products[0];
  return (
    <main data-storefront-layout="design4" className="storefront-preset storefront-design4">
      <section className="design4-topline"><div className="design4-mark"><span>APER</span><b>FY</b><small>DROPS</small></div><div className="design4-shipping"><Truck className="h-4 w-4" />{es ? 'Envío a todo USA' : 'Shipping across USA'}</div><Link to="/ask" className="design4-request">{es ? '¿No lo encuentras?' : 'Can’t find it?'}<ArrowRight className="h-4 w-4" /></Link></section>
      <section className="design4-hero"><div><p className="design4-kicker"><Zap className="h-4 w-4" />{es ? 'NUEVOS INGRESOS' : 'NEW ARRIVALS'}</p><h1>{es ? 'Lo nuevo llega primero aquí.' : 'The next drop lands here first.'}</h1><p>{es ? 'Compara marcas, encuentra disponibilidad y compra antes de que se agote.' : 'Compare brands, find availability and shop before it sells out.'}</p></div><div className="design4-hero-media"><FeatureImage product={hero} /><span>{hero?.categories ? (es ? hero.categories.name_es : hero.categories.name_en) : 'APERFY DROP'}</span></div></section>
      {brands.length > 0 && <section className="design4-brands"><p>{es ? 'MARCAS QUE ESTAMOS SIGUIENDO' : 'BRANDS WE ARE WATCHING'}</p><div>{brands.map((brand) => <span key={brand}>{brand}</span>)}</div></section>}
      <section className="design4-catalog"><div className="design4-catalog-heading"><div><p>{es ? 'CATÁLOGO ACTIVO' : 'LIVE CATALOG'}</p><h2>{es ? 'Nuevas oportunidades' : 'New opportunities'}</h2></div><span>{visible.length.toString().padStart(2, '0')} {es ? 'PRODUCTOS' : 'PRODUCTS'}</span></div><PresetControls es={es} {...controls} /><div className={`design4-products ${controls.viewMode === 'list' ? 'is-list' : ''}`}>{visible.length > 0 ? visible.map((product, index) => <StorefrontProductTile key={product.id} product={product} index={index} variant="drops" />) : <p className="storefront-preset-empty">{es ? 'No hay productos con esos filtros.' : 'No products match these filters.'}</p>}</div><div className="design4-category-footer">{categories.slice(0, 6).map(([slug, label]) => <Link key={slug} to={`/?category=${slug}`}>{label}<ArrowRight className="h-3.5 w-3.5" /></Link>)}</div></section>
    </main>
  );
}
