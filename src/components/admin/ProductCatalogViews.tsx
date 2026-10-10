import { Image, Pencil, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { Category, Product } from '@/lib/model-types';

export type AdminProduct = Pick<Product, 'id' | 'name_en' | 'name_es' | 'description_en' | 'description_es' | 'slug' | 'base_price' | 'condition_status' | 'category_id' | 'is_active' | 'is_featured' | 'images'> & {
  inventory_enabled: Product['inventory_enabled'];
  stock_quantity: Product['stock_quantity'];
  low_stock_threshold: Product['low_stock_threshold'];
  categories: Pick<Category, 'name_en' | 'name_es'> | null;
};

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

function ProductImage({ product, className = 'h-14 w-14' }: { product: AdminProduct; className?: string }) {
  const image = Array.isArray(product.images) && typeof product.images[0] === 'string' ? product.images[0] : null;
  return image ? (
    <img src={image} alt={product.name_es || product.name_en} loading="lazy" className={`${className} shrink-0 rounded-xl object-cover`} />
  ) : (
    <div className={`${className} flex shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground`} aria-label="Sin imagen">
      <Image className="h-5 w-5" aria-hidden="true" />
    </div>
  );
}

function SelectProduct({ product, checked, onChange }: { product: AdminProduct; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <span className="flex min-h-11 min-w-11 items-center justify-center">
      <Checkbox checked={checked} onCheckedChange={(next) => onChange(next === true)} aria-label={`Seleccionar ${product.name_es || product.name_en}`} />
    </span>
  );
}

function ProductActions({ product, onToggle, onEdit, onDelete, compact = false }: {
  product: AdminProduct;
  onToggle: ProductCatalogViewsProps['onToggle'];
  onEdit: ProductCatalogViewsProps['onEdit'];
  onDelete: ProductCatalogViewsProps['onDelete'];
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center justify-end gap-1.5 ${compact ? 'flex-wrap' : ''}`}>
      <label className="flex min-h-11 items-center gap-1.5 rounded-lg px-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground">
        <Switch
          checked={product.is_active}
          onCheckedChange={(checked) => onToggle(product.id, 'is_active', checked)}
          aria-label={product.is_active ? `Desactivar ${product.name_es}` : `Activar ${product.name_es}`}
        />
        <span className="hidden xl:inline">Activo</span>
      </label>
      <label className="flex min-h-11 items-center gap-1.5 rounded-lg px-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground">
        <Switch
          checked={product.is_featured}
          onCheckedChange={(checked) => onToggle(product.id, 'is_featured', checked)}
          aria-label={product.is_featured ? `Quitar destacado de ${product.name_es}` : `Destacar ${product.name_es}`}
        />
        <Star className={`h-4 w-4 ${product.is_featured ? 'fill-primary text-primary' : ''}`} aria-hidden="true" />
        <span className="hidden xl:inline">Destacado</span>
      </label>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => onEdit(product)}
        className="min-h-11 min-w-11 border-border/70"
        aria-label={`Editar ${product.name_es || product.name_en}`}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onDelete(product.id)}
        className="hidden min-h-11 min-w-11 text-destructive hover:bg-destructive/10 hover:text-destructive lg:inline-flex"
        aria-label={`Eliminar ${product.name_es || product.name_en}`}
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
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/70">
      <div className="hidden grid-cols-[44px_minmax(0,1fr)_minmax(150px,0.5fr)_120px_100px] items-center gap-3 border-b border-border/70 bg-secondary/20 px-4 py-3 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground lg:grid">
        <Checkbox checked={allProductsSelected} onCheckedChange={(checked) => onToggleAll(checked === true)} aria-label={allProductsSelected ? 'Deseleccionar todos' : 'Seleccionar todos'} />
        <span>Producto</span><span>Categoría</span><span>Precio</span><span>Activo</span>
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
                <div className="min-w-0 lg:hidden"><p className="truncate text-sm font-medium">{product.name_es || product.name_en}</p><p className="text-xs text-muted-foreground">Edición por lote</p></div>
              </div>
              <Input value={name} onChange={(event) => onBulkFieldChange(product.id, 'name_es', event.target.value, product.name_es)} className="h-10 bg-secondary/50 text-sm lg:h-9" aria-label={`Nombre de ${product.name_es}`} />
              <Select value={categoryId} onValueChange={(value) => onBulkFieldChange(product.id, 'category_id', value, product.category_id || '')}>
                <SelectTrigger className="h-10 bg-secondary/50 text-sm lg:h-9"><SelectValue placeholder="Categoría" /></SelectTrigger>
                <SelectContent>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name_es}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" min="0" step="0.01" value={price} onChange={(event) => onBulkFieldChange(product.id, 'base_price', Number(event.target.value) || 0, product.base_price)} className="h-10 bg-secondary/50 text-sm lg:h-9" aria-label={`Precio de ${product.name_es}`} />
              <label className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground"><Switch checked={active === true} onCheckedChange={(checked) => onBulkFieldChange(product.id, 'is_active', checked, product.is_active)} /> Activo</label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProductListView({ products, selectedProductIds, allProductsSelected, onToggleAll, onToggleSelected, onToggle, onEdit, onDelete }: Pick<ProductCatalogViewsProps, 'products' | 'selectedProductIds' | 'allProductsSelected' | 'onToggleAll' | 'onToggleSelected' | 'onToggle' | 'onEdit' | 'onDelete'>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/70">
      <div className="hidden items-center gap-4 border-b border-border/70 bg-secondary/20 px-4 py-3 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground lg:grid lg:grid-cols-[44px_minmax(0,1fr)_auto]">
        <Checkbox checked={allProductsSelected} onCheckedChange={(checked) => onToggleAll(checked === true)} aria-label={allProductsSelected ? 'Deseleccionar todos' : 'Seleccionar todos'} />
        <span>Producto</span><span className="text-right">Acciones</span>
      </div>
      <div className="divide-y divide-border/60">
        {products.map((product) => (
          <div key={product.id} className={`grid grid-cols-[44px_minmax(0,1fr)] items-center gap-x-2 gap-y-2 px-3 py-3 sm:grid-cols-[44px_minmax(0,1fr)_auto] sm:gap-4 sm:px-4 ${selectedProductIds.includes(product.id) ? 'bg-destructive/[0.05]' : ''}`}>
            <SelectProduct product={product} checked={selectedProductIds.includes(product.id)} onChange={(checked) => onToggleSelected(product.id, checked)} />
            <div className="flex min-w-0 items-center gap-3">
              <ProductImage product={product} />
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground sm:text-base">{product.name_es || product.name_en}</p>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide ${product.condition_status === 'used' ? 'bg-amber-400/15 text-amber-300' : 'bg-primary/15 text-primary'}`}>
                    {product.condition_status === 'used' ? 'USED' : 'NEW'}
                  </span>
                </div>
                <p className="mt-1 font-mono text-sm font-semibold text-primary">${Number(product.base_price).toFixed(2)}</p>
              </div>
            </div>
            <ProductActions product={product} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductGridView({ products, selectedProductIds, onToggleSelected, onToggle, onEdit, onDelete }: Pick<ProductCatalogViewsProps, 'products' | 'selectedProductIds' | 'onToggleSelected' | 'onToggle' | 'onEdit' | 'onDelete'>) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {products.map((product) => (
        <article key={product.id} className={`min-w-0 overflow-hidden rounded-2xl border bg-card/70 shadow-[0_16px_40px_hsl(220_35%_2%/.18)] transition-colors ${selectedProductIds.includes(product.id) ? 'border-destructive/60' : 'border-border/70 hover:border-primary/40'}`}>
          <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
            <ProductImage product={product} className="h-full w-full rounded-none" />
            <div className="absolute left-2 top-2 rounded-md bg-background/85 px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
              {product.is_active ? 'Activo' : 'Oculto'}
            </div>
            <div className="absolute right-2 top-2">
              <SelectProduct product={product} checked={selectedProductIds.includes(product.id)} onChange={(checked) => onToggleSelected(product.id, checked)} />
            </div>
          </div>
          <div className="space-y-3 p-3 sm:p-4">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="truncate text-sm font-semibold text-foreground sm:text-base">{product.name_es || product.name_en}</h3>
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide ${product.condition_status === 'used' ? 'bg-amber-400/15 text-amber-300' : 'bg-primary/15 text-primary'}`}>
                  {product.condition_status === 'used' ? 'USED' : 'NEW'}
                </span>
              </div>
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
  if (props.products.length === 0) {
    return <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 px-5 py-14 text-center text-sm text-muted-foreground">No hay productos aún.</div>;
  }

  if (props.bulkEditMode) return <BulkProductTable {...props} />;
  if (props.viewMode === 'grid') return <ProductGridView {...props} />;
  return <ProductListView {...props} />;
}
