import { useState, type ReactNode } from 'react';
import { BadgeCheck, CircleDollarSign, ExternalLink, Image, MapPin, Package, Pencil, Star, Tag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { Category, Product } from '@/lib/model-types';
import { optimizeImageUrl } from '@/lib/image-url';
import { useLanguage } from '@/i18n/LanguageContext';

export type AdminProduct = Pick<Product, 'id' | 'brand' | 'name_en' | 'name_es' | 'description_en' | 'description_es' | 'allows_special_notes' | 'slug' | 'base_price' | 'venezuela_price_usd' | 'venezuela_price_mode' | 'venezuela_manual_mode' | 'venezuela_markup_percent' | 'condition_status' | 'seller_name' | 'return_policy_en' | 'return_policy_es' | 'return_window_days' | 'category_id' | 'is_active' | 'is_featured' | 'images'> & {
  ai_image_generation_id?: string | null;
  ai_image_generated_at?: string | null;
  ai_price_generation_id?: string | null;
  ai_price_generated_at?: string | null;
  inventory_enabled: Product['inventory_enabled'];
  stock_quantity: Product['stock_quantity'];
  low_stock_threshold: Product['low_stock_threshold'];
  categories: Pick<Category, 'name_en' | 'name_es'> | null;
};

function getProductName(product: AdminProduct, language: 'en' | 'es') {
  return (language === 'es' ? product.name_es : product.name_en) || product.name_es || product.name_en;
}

function AiProvenanceBadges({ product }: { product: AdminProduct }) {
  const { t } = useLanguage();
  if (!product.ai_image_generation_id && !product.ai_price_generation_id) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5" title={t.admin.products.imageAi}>
      {product.ai_image_generation_id && (
        <span className="inline-flex whitespace-nowrap items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-primary">
          <BadgeCheck className="h-3 w-3" aria-hidden="true" /> {t.admin.products.imageAi}
        </span>
      )}
      {product.ai_price_generation_id && (
        <span className="inline-flex whitespace-nowrap items-center gap-1 rounded-full border border-sky-400/25 bg-sky-400/10 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-sky-300">
          <BadgeCheck className="h-3 w-3" aria-hidden="true" /> {t.admin.products.priceAi}
        </span>
      )}
    </div>
  );
}

export type BulkField = 'name_es' | 'base_price' | 'category_id' | 'is_active';
export type BulkValueMap = Pick<AdminProduct, BulkField>;
export type BulkEdit = Partial<Pick<AdminProduct, BulkField>>;
export type ProductViewMode = 'list' | 'grid';

type ProductCatalogViewsProps = {
  products: AdminProduct[];
  categories: Pick<Category, 'id' | 'name_es'>[];
  viewMode: ProductViewMode;
  bulkEditMode: boolean;
  bulkEdits: Record<string, BulkEdit>;
  selectedProductIds: string[];
  allProductsSelected: boolean;
  onToggleAll: (checked: boolean) => void;
  onToggleSelected: (productId: string, checked: boolean) => void;
  getBulkValue: <Field extends BulkField>(productId: string, field: Field, original: BulkValueMap[Field]) => BulkValueMap[Field];
  onBulkFieldChange: <Field extends BulkField>(productId: string, field: Field, value: BulkValueMap[Field], original: BulkValueMap[Field]) => void;
  onToggle: (productId: string, field: 'is_active' | 'is_featured', value: boolean) => void;
  onEdit: (product: AdminProduct) => void;
  onDelete: (productId: string) => void;
};

function ProductImage({ product, className = 'h-14 w-14', onClick }: { product: AdminProduct; className?: string; onClick?: () => void }) {
  const { language, t } = useLanguage();
  const productName = getProductName(product, language);
  const image = Array.isArray(product.images) && typeof product.images[0] === 'string' ? product.images[0] : null;
  if (image && onClick) {
    return (
      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); onClick(); }}
        className={`${className} group relative shrink-0 overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
        aria-label={`${t.admin.products.enlarge} ${productName}`}
      >
        <img src={optimizeImageUrl(image, { width: 240, quality: 72 })} alt={productName} loading="lazy" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-[9px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">{t.admin.products.enlarge}</span>
      </button>
    );
  }
  return image ? (
    <img src={optimizeImageUrl(image, { width: 240, quality: 72 })} alt={productName} loading="lazy" className={`${className} shrink-0 rounded-xl object-cover`} />
  ) : (
    <div className={`${className} flex shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground`} aria-label={t.admin.products.noImage}>
      <Image className="h-5 w-5" aria-hidden="true" />
    </div>
  );
}

function SelectProduct({ product, checked, onChange }: { product: AdminProduct; checked: boolean; onChange: (checked: boolean) => void }) {
  const { language, t } = useLanguage();
  const productName = getProductName(product, language);
  return (
    <span className="flex min-h-11 min-w-11 items-center justify-center" onClick={(event) => event.stopPropagation()}>
      <Checkbox checked={checked} onCheckedChange={(next) => onChange(next === true)} aria-label={`${t.admin.products.selectProduct} ${productName}`} />
    </span>
  );
}

function ProductActions({ product, onToggle, onEdit, onDelete, compact = false, className = '' }: {
  product: AdminProduct;
  onToggle: ProductCatalogViewsProps['onToggle'];
  onEdit: ProductCatalogViewsProps['onEdit'];
  onDelete: ProductCatalogViewsProps['onDelete'];
  compact?: boolean;
  className?: string;
}) {
  const { language, t } = useLanguage();
  const productName = getProductName(product, language);
  return (
    <div className={`${compact ? 'flex w-full min-w-0 items-center justify-end gap-1 sm:w-auto sm:gap-1.5' : 'flex items-center justify-end gap-1.5'} ${className}`} onClick={(event) => event.stopPropagation()}>
      <label className="flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg px-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground">
        <Switch
          checked={product.is_active}
          onCheckedChange={(checked) => onToggle(product.id, 'is_active', checked)}
          aria-label={product.is_active ? `${t.admin.products.active} ${productName}` : `${t.admin.products.active} ${productName}`}
        />
        <span className="hidden xl:inline">{t.admin.products.active}</span>
      </label>
      <label className="flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground">
        <Switch
          checked={product.is_featured}
          onCheckedChange={(checked) => onToggle(product.id, 'is_featured', checked)}
          aria-label={`${t.admin.products.featured} ${productName}`}
        />
        <Star className={`h-4 w-4 ${product.is_featured ? 'fill-primary text-primary' : ''}`} aria-hidden="true" />
        <span className="hidden xl:inline">{t.admin.products.featured}</span>
      </label>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => onEdit(product)}
        className="min-h-11 min-w-11 border-border/70"
        aria-label={`${t.admin.products.edit} ${productName}`}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onDelete(product.id)}
        className="hidden min-h-11 min-w-11 text-destructive hover:bg-destructive/10 hover:text-destructive lg:inline-flex"
        aria-label={`${t.admin.products.delete} ${productName}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function BulkProductTable({
  products,
  categories,
  bulkEdits,
  selectedProductIds,
  allProductsSelected,
  onToggleAll,
  onToggleSelected,
  getBulkValue,
  onBulkFieldChange,
}: Pick<ProductCatalogViewsProps, 'products' | 'categories' | 'bulkEdits' | 'selectedProductIds' | 'allProductsSelected' | 'onToggleAll' | 'onToggleSelected' | 'getBulkValue' | 'onBulkFieldChange'>) {
  const { language, t } = useLanguage();
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/70">
      <div className="hidden grid-cols-[44px_minmax(0,1fr)_minmax(150px,0.5fr)_120px_100px] items-center gap-3 border-b border-border/70 bg-secondary/20 px-4 py-3 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground lg:grid">
        <Checkbox checked={allProductsSelected} onCheckedChange={(checked) => onToggleAll(checked === true)} aria-label={allProductsSelected ? t.admin.products.deselectAll : t.admin.products.selectAll} />
        <span>{t.admin.products.product}</span><span>{t.admin.products.category}</span><span>{t.admin.products.price}</span><span>{t.admin.products.active}</span>
      </div>
      <div className="divide-y divide-border/60">
        {products.map((product) => {
          const edited = Boolean(bulkEdits[product.id]);
          const name = getBulkValue(product.id, 'name_es', product.name_es);
          const categoryId = getBulkValue(product.id, 'category_id', product.category_id || '') || '';
          const price = getBulkValue(product.id, 'base_price', product.base_price);
          const active = getBulkValue(product.id, 'is_active', product.is_active);
          return (
            <div key={product.id} className={`grid gap-3 px-3 py-3 sm:px-4 lg:grid-cols-[44px_minmax(0,1fr)_minmax(150px,0.5fr)_120px_100px] lg:items-center ${edited ? 'bg-primary/5' : ''}`}>
              <div className="flex items-center gap-2 lg:block">
                <SelectProduct product={product} checked={selectedProductIds.includes(product.id)} onChange={(checked) => onToggleSelected(product.id, checked)} />
                <div className="min-w-0 lg:hidden"><p className="truncate text-sm font-medium">{getProductName(product, language)}</p><p className="text-xs text-muted-foreground">{t.admin.products.bulkEdit}</p></div>
              </div>
              <Input value={name} onChange={(event) => onBulkFieldChange(product.id, 'name_es', event.target.value, product.name_es)} className="h-10 bg-secondary/50 text-sm lg:h-9" aria-label={`Nombre de ${product.name_es}`} />
              <Select value={categoryId} onValueChange={(value) => onBulkFieldChange(product.id, 'category_id', value, product.category_id || '')}>
                <SelectTrigger className="h-10 bg-secondary/50 text-sm lg:h-9"><SelectValue placeholder={t.admin.products.category} /></SelectTrigger>
                <SelectContent>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name_es}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" min="0" step="0.01" value={price} onChange={(event) => onBulkFieldChange(product.id, 'base_price', Number(event.target.value) || 0, product.base_price)} className="h-10 bg-secondary/50 text-sm lg:h-9" aria-label={`Precio de ${product.name_es}`} />
              <label className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground"><Switch checked={active === true} onCheckedChange={(checked) => onBulkFieldChange(product.id, 'is_active', checked, product.is_active)} /> {t.admin.products.active}</label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProductListView({ products, selectedProductIds, allProductsSelected, onToggleAll, onToggleSelected, onToggle, onEdit, onDelete, onInspect, onPreviewImage }: Pick<ProductCatalogViewsProps, 'products' | 'selectedProductIds' | 'allProductsSelected' | 'onToggleAll' | 'onToggleSelected' | 'onToggle' | 'onEdit' | 'onDelete'> & { onInspect: (product: AdminProduct) => void; onPreviewImage: (product: AdminProduct) => void }) {
  const { language, t } = useLanguage();
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/70">
      <div className="hidden items-center gap-4 border-b border-border/70 bg-secondary/20 px-4 py-3 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground lg:grid lg:grid-cols-[44px_minmax(0,1fr)_auto]">
        <Checkbox checked={allProductsSelected} onCheckedChange={(checked) => onToggleAll(checked === true)} aria-label={allProductsSelected ? t.admin.products.deselectAll : t.admin.products.selectAll} />
        <span>{t.admin.products.product}</span><span className="text-right">{t.admin.products.actions}</span>
      </div>
      <div className="divide-y divide-border/60">
        {products.map((product) => (
          <div
            key={product.id}
            role="button"
            tabIndex={0}
            onClick={() => onInspect(product)}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onInspect(product); } }}
            className={`grid min-w-0 cursor-pointer grid-cols-[44px_minmax(0,1fr)] items-center gap-x-2 gap-y-3 px-3 py-3 transition-colors hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:grid-cols-[44px_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:px-4 ${selectedProductIds.includes(product.id) ? 'bg-destructive/[0.05]' : ''}`}
          >
            <SelectProduct product={product} checked={selectedProductIds.includes(product.id)} onChange={(checked) => onToggleSelected(product.id, checked)} />
            <div className="flex min-w-0 items-center gap-3">
              <ProductImage product={product} onClick={() => onPreviewImage(product)} />
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground sm:text-base">{getProductName(product, language)}</p>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide ${product.condition_status === 'used' ? 'bg-amber-400/15 text-amber-300' : 'bg-primary/15 text-primary'}`}>
                    {product.condition_status === 'used' ? t.admin.products.used : t.admin.products.new}
                  </span>
                </div>
                {product.brand && <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{product.brand}</p>}
                <div className="mt-1"><AiProvenanceBadges product={product} /></div>
                <p className="mt-1 font-mono text-sm font-semibold text-primary">${Number(product.base_price).toFixed(2)}</p>
              </div>
            </div>
            <ProductActions product={product} compact className="col-span-2 sm:col-span-1 sm:col-start-3 sm:row-start-1" onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductGridView({ products, selectedProductIds, onToggleSelected, onToggle, onEdit, onDelete, onInspect, onPreviewImage }: Pick<ProductCatalogViewsProps, 'products' | 'selectedProductIds' | 'onToggleSelected' | 'onToggle' | 'onEdit' | 'onDelete'> & { onInspect: (product: AdminProduct) => void; onPreviewImage: (product: AdminProduct) => void }) {
  const { language, t } = useLanguage();
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {products.map((product) => (
        <article
          key={product.id}
          role="button"
          tabIndex={0}
          onClick={() => onInspect(product)}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onInspect(product); } }}
          className={`min-w-0 cursor-pointer overflow-hidden rounded-2xl border bg-card/70 shadow-[0_16px_40px_hsl(220_35%_2%/.18)] transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selectedProductIds.includes(product.id) ? 'border-destructive/60' : 'border-border/70'}`}
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
            <ProductImage product={product} className="h-full w-full rounded-none" onClick={() => onPreviewImage(product)} />
            <div className="absolute left-2 top-2 rounded-md bg-background/85 px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
              {product.is_active ? t.admin.products.active : t.admin.products.hidden}
            </div>
            <div className="absolute right-2 top-2">
              <SelectProduct product={product} checked={selectedProductIds.includes(product.id)} onChange={(checked) => onToggleSelected(product.id, checked)} />
            </div>
          </div>
          <div className="space-y-3 p-3 sm:p-4">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="truncate text-sm font-semibold text-foreground sm:text-base">{getProductName(product, language)}</h3>
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide ${product.condition_status === 'used' ? 'bg-amber-400/15 text-amber-300' : 'bg-primary/15 text-primary'}`}>
                  {product.condition_status === 'used' ? t.admin.products.used : t.admin.products.new}
                </span>
              </div>
              {product.brand && <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{product.brand}</p>}
              <div className="mt-1"><AiProvenanceBadges product={product} /></div>
              <p className="mt-1 font-mono text-sm font-semibold text-primary">${Number(product.base_price).toFixed(2)}</p>
            </div>
            <ProductActions product={product} compact onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
          </div>
        </article>
      ))}
    </div>
  );
}

export default function ProductCatalogViews(props: ProductCatalogViewsProps) {
  const { language, t } = useLanguage();
  const [inspectedProduct, setInspectedProduct] = useState<AdminProduct | null>(null);
  const [previewProduct, setPreviewProduct] = useState<AdminProduct | null>(null);

  if (props.products.length === 0) {
    return <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 px-5 py-14 text-center text-sm text-muted-foreground">{t.admin.products.noProducts}</div>;
  }

  const openPreview = (product: AdminProduct) => setPreviewProduct(product);
  const openInspect = (product: AdminProduct) => setInspectedProduct(product);
  const closeInspect = () => setInspectedProduct(null);
  const inspectedImage = inspectedProduct && Array.isArray(inspectedProduct.images) && typeof inspectedProduct.images[0] === 'string' ? inspectedProduct.images[0] : null;
  const inspectedName = inspectedProduct ? getProductName(inspectedProduct, language) : '';
  const inspectedCategory = inspectedProduct ? ((language === 'es' ? inspectedProduct.categories?.name_es : inspectedProduct.categories?.name_en) || t.admin.products.noCategory) : t.admin.products.noCategory;
  const inspectedDescription = inspectedProduct ? ((language === 'es' ? inspectedProduct.description_es : inspectedProduct.description_en) || inspectedProduct.description_es || inspectedProduct.description_en || t.admin.products.noDescription) : t.admin.products.noDescription;

  const view = props.bulkEditMode
    ? <BulkProductTable {...props} />
    : props.viewMode === 'grid'
      ? <ProductGridView {...props} onInspect={openInspect} onPreviewImage={openPreview} />
      : <ProductListView {...props} onInspect={openInspect} onPreviewImage={openPreview} />;

  return (
    <>
      {view}

      <Dialog open={Boolean(previewProduct)} onOpenChange={(open) => !open && setPreviewProduct(null)}>
        <DialogContent className="max-w-[min(92vw,760px)] border-border/80 bg-card/98 p-4 sm:p-5">
          <DialogHeader className="pr-8">
            <DialogTitle className="truncate text-base">{previewProduct ? getProductName(previewProduct, language) : t.admin.products.detailTitle}</DialogTitle>
            <DialogDescription>{t.admin.products.previewDescription}</DialogDescription>
          </DialogHeader>
          {previewProduct && Array.isArray(previewProduct.images) && typeof previewProduct.images[0] === 'string' && (
            <div className="flex max-h-[70vh] items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-secondary/40 p-2">
              <img
                src={optimizeImageUrl(previewProduct.images[0], { width: 1200, quality: 84 })}
                alt={getProductName(previewProduct, language)}
                className="max-h-[68vh] w-auto max-w-full rounded-lg object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(inspectedProduct)} onOpenChange={(open) => !open && closeInspect()}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto border-border/80 bg-card/98 p-0">
          {inspectedProduct && (
            <>
              <div className="border-b border-border/70 bg-secondary/20 p-5 pr-12 sm:p-6">
                <div className="flex items-start gap-4">
                  {inspectedImage ? (
                    <button type="button" onClick={() => openPreview(inspectedProduct)} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      <img src={optimizeImageUrl(inspectedImage, { width: 240, quality: 78 })} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      <span className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-[9px] text-white">{t.admin.products.enlarge}</span>
                    </button>
                  ) : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground"><Image className="h-6 w-6" /></div>}
                  <DialogHeader className="min-w-0 text-left">
                    <DialogTitle className="text-xl leading-tight">{inspectedName}</DialogTitle>
                    <DialogDescription className="truncate">{inspectedProduct.slug}</DialogDescription>
                    <div className="flex flex-wrap gap-2 pt-1 text-[10px] font-mono uppercase tracking-wider">
                      <span className="rounded-full bg-primary/15 px-2 py-1 text-primary">{inspectedProduct.condition_status === 'used' ? t.admin.products.used : t.admin.products.newStatus}</span>
                      <span className={`rounded-full px-2 py-1 ${inspectedProduct.is_active ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>{inspectedProduct.is_active ? t.admin.products.visible : t.admin.products.hidden}</span>
                      <AiProvenanceBadges product={inspectedProduct} />
                    </div>
                  </DialogHeader>
                </div>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoStat icon={<CircleDollarSign className="h-4 w-4" />} label={t.admin.products.usaPrice} value={`$${Number(inspectedProduct.base_price || 0).toFixed(2)} USD`} />
                  <InfoStat icon={<MapPin className="h-4 w-4" />} label={t.admin.products.venezuelaPrice} value={`$${Number(inspectedProduct.venezuela_price_usd || 0).toFixed(2)} USD`} />
                  <InfoStat icon={<Tag className="h-4 w-4" />} label={t.admin.products.brand} value={inspectedProduct.brand || t.admin.products.unspecified} />
                  <InfoStat icon={<Tag className="h-4 w-4" />} label={t.admin.products.category} value={inspectedCategory} />
                  <InfoStat icon={<Package className="h-4 w-4" />} label={t.admin.products.inventory} value={inspectedProduct.inventory_enabled ? `${inspectedProduct.stock_quantity} ${t.admin.products.available}` : t.admin.products.noInventory} />
                </div>

                <section className="space-y-2">
                  <h3 className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">{t.admin.products.description}</h3>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/85">{inspectedDescription}</p>
                </section>

                <div className="grid gap-4 border-t border-border/70 pt-4 text-sm sm:grid-cols-2">
                  <DetailLine label={t.admin.products.seller} value={inspectedProduct.seller_name || 'APERFY'} />
                  <DetailLine label={t.admin.products.returns} value={`${inspectedProduct.return_window_days || 0} ${t.admin.products.days}`} />
                  <DetailLine label={t.admin.products.venezuelaPrice} value={inspectedProduct.venezuela_price_mode === 'manual' ? t.admin.products.manual : t.admin.products.global} />
                  <DetailLine label={t.admin.products.featured} value={inspectedProduct.is_featured ? t.admin.products.yes : t.admin.products.no} />
                  <DetailLine label={t.admin.products.internalImageAi} value={inspectedProduct.ai_image_generation_id ? `${t.admin.products.yes} · ${inspectedProduct.ai_image_generated_at ? new Date(inspectedProduct.ai_image_generated_at).toLocaleDateString() : t.admin.products.registered}` : t.admin.products.notRegistered} />
                  <DetailLine label={t.admin.products.internalPriceAi} value={inspectedProduct.ai_price_generation_id ? `${t.admin.products.yes} · ${inspectedProduct.ai_price_generated_at ? new Date(inspectedProduct.ai_price_generated_at).toLocaleDateString() : t.admin.products.registered}` : t.admin.products.notRegistered} />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-4">
                  {inspectedProduct.slug && (
                    <Button type="button" variant="ghost" asChild className="gap-2 text-muted-foreground">
                      <a href={`/products/${inspectedProduct.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> {t.admin.products.viewStore}</a>
                    </Button>
                  )}
                  <Button type="button" onClick={() => { const product = inspectedProduct; closeInspect(); props.onEdit(product); }} className="gap-2"><Pencil className="h-4 w-4" /> {t.admin.products.editProduct}</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function InfoStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border border-border/70 bg-secondary/30 p-3"><div className="flex items-center gap-2 text-primary"><span>{icon}</span><span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span></div><p className="mt-1 text-sm font-semibold">{value}</p></div>;
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return <div><span className="block text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span><span className="mt-1 block text-foreground/85">{value}</span></div>;
}
