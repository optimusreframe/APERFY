import { useState, useRef, useCallback, useEffect } from 'react';
import { useBulkImport } from '@/contexts/BulkImportContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Image, Sparkles, Link2, Upload, X, GripVertical, Film, RefreshCw, Wand2, ImagePlus, Lock, Unlock, Languages, List, LayoutGrid, CheckCircle2, AlertCircle, Loader2, Save, XCircle, Weight, Ruler, Check, Clipboard, Search } from 'lucide-react';
import { logActivity } from '@/lib/activity-log';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { productSchema, validateMediaFile, sanitizeFileName } from '@/lib/validation';
import { sanitizeUrl } from '@/lib/sanitize';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminPageHeader } from './_shared';
import MarginCalculator from '@/components/admin/MarginCalculator';
import { suggestRetailPrice } from '@/lib/product-intelligence';
import { getNextWizardStep, getPreviousWizardStep, getWizardStepError } from './productWizard';
import { toggleAllBulkSelection, toggleBulkSelection } from './productBulkSelection';
import { partitionProductDeletion } from './productDeletion';
import { getErrorMessage } from '@/lib/model-types';
import { readClipboardImage } from '@/lib/image-clipboard';
import ProductCatalogViews, { type AdminProduct, type BulkEdit, type BulkField, type ProductViewMode } from '@/components/admin/ProductCatalogViews';
import { calculateVenezuelaUsdPrice, DEFAULT_VENEZUELA_MARKUP_PERCENT, normalizeVenezuelaMarkup, type VenezuelaManualMode, type VenezuelaPriceMode } from '@/lib/venezuela-pricing';
import { getVariationTranslationPayload } from './variationTranslation';

// ── Types ──
interface ProductForm {
  brand: string;
  name_en: string;
  name_es: string;
  description_en: string;
  description_es: string;
  slug: string;
  base_price: number;
  venezuela_price_usd: number;
  venezuela_price_mode: VenezuelaPriceMode;
  venezuela_manual_mode: VenezuelaManualMode;
  venezuela_markup_percent: number;
  condition_status: 'new' | 'used';
  seller_name: string;
  return_policy_en: string;
  return_policy_es: string;
  return_window_days: number;
  category_id: string;
  is_active: boolean;
  is_featured: boolean;
  inventory_enabled: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
  allows_special_notes: boolean;
}

interface MediaItem {
  id: string;
  file?: File;
  preview: string;
  type: 'image' | 'gif' | 'video';
  isExisting?: boolean;
}

interface AiProductData {
  brand?: string;
  name_es: string;
  description_es: string;
  name_en?: string;
  description_en?: string;
  slug: string;
  suggested_price: number;
  suggested_category: string;
  suggested_category_name_es?: string;
  materials?: string[];
  colors?: string[];
  price_confidence?: string;
  price_source?: string;
  matched_listings_count?: number;
  search_queries_used?: string[];
  [key: string]: unknown;
}

interface AiPhotoCandidate {
  id: string;
  name: string;
  name_es?: string;
  description_es?: string;
  brand: string;
  model: string;
  category: string;
  description: string;
  attributes: string[];
  search_query: string;
  market_reference_price: number;
  suggested_price: number;
  confidence: 'high' | 'medium' | 'low';
  market_sources?: Array<{ title: string; price: number; url: string; source: string }>;
  price_source?: string;
  matched_listings_count?: number;
  selected: boolean;
}

const empty: ProductForm = {
  brand: '',
  name_en: '', name_es: '', description_en: '', description_es: '',
  slug: '', base_price: 0, venezuela_price_usd: 0, venezuela_price_mode: 'global', venezuela_manual_mode: 'fixed', venezuela_markup_percent: DEFAULT_VENEZUELA_MARKUP_PERCENT, condition_status: 'new', seller_name: 'APERFY',
  return_policy_en: '30-day returns for eligible items. Contact APERFY before returning a product.',
  return_policy_es: 'Devoluciones de 30 días para artículos elegibles. Contacta a APERFY antes de devolver un producto.',
  return_window_days: 30, category_id: '', is_active: true, is_featured: false,
  inventory_enabled: false, stock_quantity: 0, low_stock_threshold: 3,
  allows_special_notes: false,
};

const MAX_MEDIA = 5;
const MAX_VARIATION_MEDIA = 5;
const ACCEPT_MEDIA = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm';

const COMMON_COLORS = [
  'Negro', 'Blanco', 'Gris', 'Rojo', 'Azul', 'Verde', 'Amarillo',
  'Naranja', 'Morado', 'Rosa', 'Dorado', 'Plateado', 'Marrón', 'Transparente'
];

type CategoryOption = {
  id: string;
  slug: string;
  name_es: string;
  name_en?: string | null;
};

function CategoryPicker({
  categories,
  value,
  onChange,
  onCreate,
  creating = false,
  placeholder = 'Seleccionar categoría...',
  valueMode = 'id',
}: {
  categories: CategoryOption[];
  value: string;
  onChange: (value: string) => void;
  onCreate?: (name: string) => void | Promise<void>;
  creating?: boolean;
  placeholder?: string;
  valueMode?: 'id' | 'slug';
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const sortedCategories = [...categories].sort((a, b) =>
    a.name_es.localeCompare(b.name_es, 'es', { sensitivity: 'base' }),
  );
  const selected = categories.find((category) => category.id === value || category.slug === value);
  const normalizedSearch = search.trim().toLocaleLowerCase('es');
  const filteredCategories = sortedCategories.filter((category) => {
    if (!normalizedSearch) return true;
    return [category.name_es, category.name_en || '', category.slug]
      .some((field) => field.toLocaleLowerCase('es').includes(normalizedSearch));
  });
  const canCreate = Boolean(
    onCreate && normalizedSearch && !sortedCategories.some((category) =>
      [category.name_es, category.name_en || '', category.slug]
        .some((field) => field.toLocaleLowerCase('es') === normalizedSearch),
    ),
  );

  return (
    <Popover open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setSearch(''); }}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-between bg-secondary font-normal">
          <span className={selected ? 'truncate text-foreground' : 'truncate text-muted-foreground'}>
            {selected?.name_es || placeholder}
          </span>
          <Search className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-[240px] p-0" onOpenAutoFocus={(event) => event.preventDefault()}>
        <Command shouldFilter={false}>
          <CommandInput value={search} onValueChange={setSearch} placeholder="Buscar categoría..." />
          <CommandList className="max-h-64">
            <CommandEmpty>{canCreate ? 'No existe todavía. Puedes crearla abajo.' : 'No se encontraron categorías.'}</CommandEmpty>
            {filteredCategories.map((category) => (
              <CommandItem
                key={category.id}
                value={`${category.name_es} ${category.slug}`}
                onSelect={() => {
                  const isSelected = category.id === value || category.slug === value;
                  onChange(isSelected ? '' : valueMode === 'slug' ? category.slug : category.id);
                  setOpen(false);
                  setSearch('');
                }}
              >
                <Check className={`mr-2 h-4 w-4 ${category.id === value || category.slug === value ? 'opacity-100' : 'opacity-0'}`} />
                <span className="truncate">{category.name_es}</span>
              </CommandItem>
            ))}
            {canCreate && (
              <CommandItem
                value={`crear ${search}`}
                disabled={creating}
                onSelect={async () => {
                  await onCreate?.(search.trim());
                  setOpen(false);
                  setSearch('');
                }}
                className="border-t border-border text-primary"
              >
                <Plus className="mr-2 h-4 w-4" />
                {creating ? 'Creando...' : `Crear “${search.trim()}”`}
              </CommandItem>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── AI Progress Log ──
const AI_PROGRESS_MESSAGES = [
  '◉ Preparando producto...',
  '◉ Configurando iluminación de estudio...',
  '◉ Aplicando efecto Bokeh...',
  '◉ Renderizando en 8K...',
];

function AiProgressLog({ step }: { step: number }) {
  return (
    <div className="space-y-2 text-left px-6 w-full max-w-xs">
      {AI_PROGRESS_MESSAGES.map((msg, i) => (
        <motion.p
          key={msg}
          initial={{ opacity: 0, x: -10 }}
          animate={i <= step ? { opacity: 1, x: 0 } : { opacity: 0.2, x: 0 }}
          transition={{ delay: i * 0.1, duration: 0.3 }}
          className={`text-xs font-mono ${i <= step ? 'text-primary' : 'text-muted-foreground'}`}
        >
          {msg}
        </motion.p>
      ))}
    </div>
  );
}

// ── Helpers ──
function slugify(text: string): string {
  return text.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getMediaType(file: File): 'image' | 'gif' | 'video' {
  if (file.type === 'image/gif') return 'gif';
  if (file.type.startsWith('video/')) return 'video';
  return 'image';
}

function getMediaTypeFromUrl(url: string): 'image' | 'gif' | 'video' {
  const lower = url.toLowerCase();
  if (lower.includes('.gif')) return 'gif';
  if (lower.includes('.mp4') || lower.includes('.webm')) return 'video';
  return 'image';
}

// AI-generated media is persisted by the Edge Function in these private
// storage folders. This marker is used only by admin workflows; it is never
// sent to the storefront or included in public product projections.
function isAiGeneratedProductImage(url: string): boolean {
  return /\/generated-angles\//i.test(url)
    || (/\/composed-results\//i.test(url) && !/-non_ai-/i.test(url));
}

function getAiImageGenerationId(urls: string[], fallback: string): string {
  const generated = urls.find(isAiGeneratedProductImage);
  if (!generated) return fallback;
  return generated.split('/storage/v1/object/public/product-images/').pop()?.split('?')[0] || fallback;
}

// ── Media Thumbnail Component ──
function MediaThumb({ item, onRemove, onDragStart, onDragOver, onDrop, index }: {
  item: MediaItem; onRemove: () => void;
  onDragStart: (e: React.DragEvent, idx: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, idx: number) => void;
  index: number;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      draggable
      onDragStartCapture={(e: React.DragEvent) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e: React.DragEvent) => onDrop(e, index)}
      className="relative group w-24 h-24 rounded-xl overflow-hidden border-2 border-border hover:border-primary/50 transition-all cursor-grab active:cursor-grabbing bg-secondary"
    >
      {item.type === 'video' ? (
        <div className="w-full h-full flex items-center justify-center bg-secondary">
          <video src={item.preview} className="w-full h-full object-cover" muted />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Film className="w-6 h-6 text-white" />
          </div>
        </div>
      ) : (
        <img src={item.preview} alt="" className="w-full h-full object-cover" />
      )}
      {item.type === 'gif' && (
        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 text-[10px] text-white rounded font-bold">GIF</span>
      )}
      {index === 0 && (
        <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-primary/90 text-[10px] text-primary-foreground rounded font-bold">MAIN</span>
      )}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
        className="absolute top-1 right-1 w-5 h-5 bg-destructive/90 hover:bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3 text-white" />
      </button>
      <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-60 transition-opacity">
        <GripVertical className="w-4 h-4 text-white" />
      </div>
    </motion.div>
  );
}

type PriceReference = { source: string; title: string; price: number; url: string };
type BulkRepriceResult = {
  name: string;
  updated: boolean;
  previousPrice?: number;
  suggestedPrice?: number;
  confidence?: string;
  references: PriceReference[];
  message?: string;
};

async function getFunctionErrorMessage(error: unknown, data: unknown, fallback: string) {
  if (data && typeof data === 'object' && typeof (data as Record<string, unknown>).error === 'string') {
    return String((data as Record<string, unknown>).error);
  }

  const context = error && typeof error === 'object' ? (error as { context?: unknown }).context : undefined;
  if (context instanceof Response) {
    try {
      const payload = await context.clone().json() as Record<string, unknown>;
      if (typeof payload.error === 'string') return payload.error;
      if (typeof payload.message === 'string') return payload.message;
    } catch {
      // Fall through to the SDK error message.
    }
  }

  return getErrorMessage(error, fallback);
}

function parsePriceReferences(value: unknown): PriceReference[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      source: typeof item.source === 'string' ? item.source : 'Web',
      title: typeof item.title === 'string' ? item.title : 'Referencia de mercado',
      price: Number(item.price) || 0,
      url: typeof item.url === 'string' ? item.url : '',
    }))
    .filter((item) => item.price > 0);
}

// ══════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ──
// ══════════════════════════════════════════════════════════════
export default function AdminProducts() {
  const [open, setOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<number>(0); // 0=Media, 1=Identity, 2=Pricing, 3=Variations, 4=Review
  const [aiOpen, setAiOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(empty);
  const [mediaFiles, setMediaFiles] = useState<MediaItem[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Import state
  const [aiUrl, setAiUrl] = useState('');
  const [aiStep, setAiStep] = useState<'source' | 'loading' | 'review'>('source');
  const [aiOriginalImage, setAiOriginalImage] = useState<string | null>(null);
  const [aiOriginalImageFile, setAiOriginalImageFile] = useState<File | null>(null);
  const [aiCustomBg, setAiCustomBg] = useState<string | null>(null);
  const [aiCustomBgFile, setAiCustomBgFile] = useState<File | null>(null);
  const [aiGeneratedImage, setAiGeneratedImage] = useState<string | null>(null);
  const [aiPreviewImage, setAiPreviewImage] = useState<string | null>(null);
  const [aiStoredImageUrl, setAiStoredImageUrl] = useState<string | null>(null);
  const [aiStoredImagePath, setAiStoredImagePath] = useState<string | null>(null);
  const [aiPersistingImage, setAiPersistingImage] = useState(false);
  const [aiData, setAiData] = useState<AiProductData | null>(null);
  const [aiPhotoCandidates, setAiPhotoCandidates] = useState<AiPhotoCandidate[]>([]);
  const [aiPhotoMode, setAiPhotoMode] = useState(false);
  const [aiPhotoImporting, setAiPhotoImporting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiImageLoading, setAiImageLoading] = useState(false);
  const [aiProgressStep, setAiProgressStep] = useState(0);
  const [aiExtractedImages, setAiExtractedImages] = useState<string[]>([]);
  const [aiSelectedSourceImage, setAiSelectedSourceImage] = useState<string | null>(null);
  const [aiBgMode, setAiBgMode] = useState<string>('system_workshop');
  const [showEnglish, setShowEnglish] = useState(false);
  const [slugLocked, setSlugLocked] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [translating, setTranslating] = useState(false);
  const aiOriginalInputRef = useRef<HTMLInputElement>(null);
  const aiBgInputRef = useRef<HTMLInputElement>(null);

  // AI angle gallery (extra renders generated from primary AI image)
  type AiAngle = { url: string; path: string; angle: string; loading?: boolean; error?: string };
  const [aiAngles, setAiAngles] = useState<AiAngle[]>([]);
  const [aiAnglesGenerating, setAiAnglesGenerating] = useState(false);

  // Variations state for product modal
  interface VariationRow {
    id?: string;
    name_en: string;
    name_es: string;
    description_en: string;
    description_es: string;
    type: string;
    weight_grams: number;
    material_id: string;
    dimensions: string;
    is_active: boolean;
    price_override: number | null;
    price_override_venezuela: number | null;
    use_manual_price: boolean;
    image_url: string | null;
    images: string[];
    inventory_enabled: boolean;
    stock_quantity: number;
    low_stock_threshold: number;
    _imageFiles?: Array<{ file: File; preview: string }>;
    _isNew?: boolean;
    _deleted?: boolean;
    _uploadingImage?: boolean;
    _generatingImage?: boolean;
    _translating?: boolean;
  }
  const [productVariations, setProductVariations] = useState<VariationRow[]>([]);
  const [loadingVariations, setLoadingVariations] = useState(false);
  const createEmptyVariation = (overrides: Partial<VariationRow> = {}): VariationRow => ({
    name_en: '',
    name_es: '',
    description_en: '',
    description_es: '',
    type: 'color',
    weight_grams: 0,
    material_id: '',
    dimensions: '',
    is_active: true,
    price_override: null,
    price_override_venezuela: null,
    use_manual_price: false,
    image_url: null,
    images: [],
    inventory_enabled: true,
    stock_quantity: 0,
    low_stock_threshold: 3,
    _isNew: true,
    ...overrides,
  });


  // Edit dialog AI state
  const [editAiImageOpen, setEditAiImageOpen] = useState(false);
  const [editAiSourceImage, setEditAiSourceImage] = useState<string | null>(null);
  const [editAiBgMode, setEditAiBgMode] = useState<string>('system_workshop');
  const [editAiCustomBg, setEditAiCustomBg] = useState<string | null>(null);
  const [editAiGenerating, setEditAiGenerating] = useState(false);
  const [editRepricing, setEditRepricing] = useState(false);
  const [editAiSourceSyncing, setEditAiSourceSyncing] = useState(false);
  const [editEnhancing, setEditEnhancing] = useState(false);
  const [editTranslating, setEditTranslating] = useState(false);
  const [editAiProgressStep, setEditAiProgressStep] = useState(0);
  const editAiSourceRef = useRef<HTMLInputElement>(null);
  const editAiBgRef = useRef<HTMLInputElement>(null);

  // Progress log step timer for edit dialog
  useEffect(() => {
    if (!editAiGenerating) { setEditAiProgressStep(0); return; }
    const interval = setInterval(() => {
      setEditAiProgressStep((prev) => Math.min(prev + 1, AI_PROGRESS_MESSAGES.length - 1));
    }, 2500);
    return () => clearInterval(interval);
  }, [editAiGenerating]);

  // Bulk Import state
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkUrls, setBulkUrls] = useState('');

  // Bulk Edit state
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkEdits, setBulkEdits] = useState<Record<string, BulkEdit>>({});
  const [bulkSaving, setBulkSaving] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  type BulkAiJob = {
    kind: 'images' | 'reprice';
    total: number;
    completed: number;
    succeeded: number;
    failed: number;
    skipped: number;
    currentName: string;
    errors: string[];
    repriceResults: BulkRepriceResult[];
  };
  const [bulkAiJob, setBulkAiJob] = useState<BulkAiJob | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deleteFromEditOpen, setDeleteFromEditOpen] = useState(false);
  const [productViewMode, setProductViewMode] = useState<ProductViewMode>(() => {
    if (typeof window === 'undefined') return 'list';
    return window.localStorage.getItem('admin-products-view') === 'grid' ? 'grid' : 'list';
  });

  const bulkEditCount = Object.keys(bulkEdits).length;

  const getBulkValue = <K extends BulkField>(productId: string, field: K, original: AdminProduct[K]): AdminProduct[K] => {
    const edits = bulkEdits[productId];
    if (edits && field in edits) return edits[field] as AdminProduct[K];
    return original;
  };

  const setBulkField = <K extends BulkField>(productId: string, field: K, value: AdminProduct[K], original: AdminProduct[K]) => {
    setBulkEdits(prev => {
      const current = { ...prev };
      current[productId] = { ...current[productId], [field]: value } as BulkEdit;
      if (value === original) {
        const next = { ...current[productId] } as BulkEdit;
        delete next[field];
        if (Object.keys(next).length === 0) delete current[productId];
        else current[productId] = next;
      }
      return current;
    });
  };

  const handleBulkSave = async () => {
    const entries = Object.entries(bulkEdits);
    if (entries.length === 0) return;
    setBulkSaving(true);
    try {
      for (const [id, changes] of entries) {
        const { error } = await supabase.from('products').update(changes).eq('id', id);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      setBulkEditMode(false);
      setBulkEdits({});
      toast({ title: '✓', description: `${entries.length} producto(s) actualizado(s).` });
    } catch (e: unknown) {
      toast({ title: 'Error', description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setBulkSaving(false);
    }
  };

  // Progress log step timer
  useEffect(() => {
    if (!aiImageLoading) { setAiProgressStep(0); return; }
    const interval = setInterval(() => {
      setAiProgressStep((prev) => Math.min(prev + 1, AI_PROGRESS_MESSAGES.length - 1));
    }, 2500);
    return () => clearInterval(interval);
  }, [aiImageLoading]);

  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: products = [] } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const [{ data: productRows, error: productsError }, { data: provenanceRows, error: provenanceError }] = await Promise.all([
        supabase
          .from('products')
          .select('id, brand, name_en, name_es, slug, base_price, venezuela_price_usd, venezuela_price_mode, venezuela_manual_mode, venezuela_markup_percent, condition_status, seller_name, return_policy_en, return_policy_es, return_window_days, is_active, is_featured, category_id, images, created_at, description_en, description_es, allows_special_notes, inventory_enabled, stock_quantity, low_stock_threshold, categories(name_en, name_es)')
          .order('created_at', { ascending: false })
          .limit(1000),
        supabase
          .from('product_ai_provenance')
          .select('product_id, ai_image_generation_id, ai_image_generated_at, ai_price_generation_id, ai_price_generated_at'),
      ]);
      if (productsError) throw productsError;
      if (provenanceError) throw provenanceError;
      const provenanceByProduct = new Map((provenanceRows || []).map((row) => [row.product_id, row]));
      return (productRows || []).map((product) => ({
        ...product,
        ...provenanceByProduct.get(product.id),
      }));
    },
    staleTime: 30_000,
  });

  const visibleProductIds = products.map((product) => product.id);
  const allProductsSelected = visibleProductIds.length > 0 && visibleProductIds.every((id: string) => selectedProductIds.includes(id));

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').eq('is_active', true).order('name_es');
      if (error) throw error;
      return data;
    },
  });

  const { data: materials = [] } = useQuery({
    queryKey: ['admin-materials'],
    queryFn: async () => {
      const { data, error } = await supabase.from('materials').select('*').eq('is_active', true).order('name_en');
      if (error) throw error;
      return data;
    },
  });

  const { data: systemBgSetting } = useQuery({
    queryKey: ['admin-system-bg'],
    queryFn: async () => {
      const { data } = await supabase.from('admin_settings').select('setting_value').eq('setting_key', 'system_background').maybeSingle();
      return data?.setting_value || null;
    },
  });

  const { data: venezuelaPricingSettings = [] } = useQuery({
    queryKey: ['admin-venezuela-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase.from('admin_settings').select('setting_key, setting_value').eq('setting_key', 'venezuela_global_markup_percent');
      if (error) throw error;
      return data;
    },
  });
  const globalVenezuelaMarkupPercent = normalizeVenezuelaMarkup(
    venezuelaPricingSettings.find((row) => row.setting_key === 'venezuela_global_markup_percent')?.setting_value,
  );
  const createEmptyProductForm = (): ProductForm => ({ ...empty, venezuela_markup_percent: globalVenezuelaMarkupPercent });

  const { data: aiProductSettings = [] } = useQuery({
    queryKey: ['admin-ai-product-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('admin_settings').select('setting_key, setting_value').in('setting_key', ['ai_discount_percent', 'ai_search_enabled']);
      if (error) throw error;
      return data;
    },
  });
  const aiDiscountPercent = Number(aiProductSettings.find((row) => row.setting_key === 'ai_discount_percent')?.setting_value || 20);
  const aiSearchEnabled = aiProductSettings.find((row) => row.setting_key === 'ai_search_enabled')?.setting_value === 'true';

  // Auto-slug from name (English if showEnglish is active, otherwise Spanish)
  useEffect(() => {
    if (!slugLocked) return;
    setAiData((prev) => {
      if (!prev) return prev;
      const source = showEnglish && prev.name_en ? prev.name_en : prev.name_es;
      const nextSlug = slugify(source);
      return prev.slug === nextSlug ? prev : { ...prev, slug: nextSlug };
    });
  }, [showEnglish, slugLocked]);

  // ── Media Upload ──
  const uploadMedia = async (file: File, productId: string): Promise<string> => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeName = sanitizeFileName(`${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`);
    const path = `${productId}/${safeName}`;
    const { error } = await supabase.storage.from('product-images').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleMediaAdd = useCallback(async (files: FileList | File[]) => {
    const remaining = MAX_MEDIA - mediaFiles.length;
    if (remaining <= 0) {
      toast({ title: `Máximo ${MAX_MEDIA} archivos permitidos`, variant: 'destructive' });
      return;
    }
    const toAdd = Array.from(files).slice(0, remaining);
    const newItems: MediaItem[] = [];
    for (const file of toAdd) {
      const validation = await validateMediaFile(file);
      if (!validation.valid) {
        toast({ title: validation.error || 'Archivo inválido', variant: 'destructive' });
        continue;
      }
      newItems.push({
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        file,
        preview: URL.createObjectURL(file),
        type: getMediaType(file),
      });
    }
    setMediaFiles(prev => [...prev, ...newItems]);
  }, [mediaFiles.length, toast]);

  const removeMedia = (id: string) => {
    setMediaFiles(prev => {
      const item = prev.find(m => m.id === id);
      if (item?.file) URL.revokeObjectURL(item.preview);
      return prev.filter(m => m.id !== id);
    });
  };

  const handleDragStart = (_e: React.DragEvent, idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (_e: React.DragEvent, targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    setMediaFiles(prev => {
      const updated = [...prev];
      const [dragged] = updated.splice(dragIdx, 1);
      updated.splice(targetIdx, 0, dragged);
      return updated;
    });
    setDragIdx(null);
  };

  const handleDropZone = (e: React.DragEvent) => {
    e.preventDefault();
    handleMediaAdd(e.dataTransfer.files);
  };

  // ── Save Product ──
  const save = useMutation({
    mutationFn: async (f: ProductForm) => {
      const result = productSchema.safeParse(f);
      if (!result.success) {
        const errs: Record<string, string> = {};
        result.error.issues.forEach(i => { errs[i.path[0] as string] = i.message; });
        setFieldErrors(errs);
        throw new Error('Validation failed');
      }
      setFieldErrors({});

      const basePrice = Number(f.base_price);
      const manualMarkup = f.venezuela_price_mode === 'manual' && f.venezuela_manual_mode === 'percentage'
        ? normalizeVenezuelaMarkup(f.venezuela_markup_percent)
        : null;
      const venezuelaPrice = calculateVenezuelaUsdPrice({
        usaPrice: basePrice,
        mode: f.venezuela_price_mode,
        manualMode: f.venezuela_manual_mode,
        fixedPrice: f.venezuela_price_usd,
        markupPercent: manualMarkup,
        globalMarkupPercent: globalVenezuelaMarkupPercent,
      });
      const hasVariants = productVariations.some((variation) => !variation._deleted);
      const payload = {
        ...f,
        category_id: f.category_id || null,
        base_price: basePrice,
        venezuela_price_usd: venezuelaPrice,
        venezuela_markup_percent: manualMarkup,
        // Variant inventory is authoritative whenever at least one active
        // variant exists. Keep the legacy product fields available for
        // products without variants, but never let both ledgers compete.
        inventory_enabled: hasVariants ? false : f.inventory_enabled,
        stock_quantity: hasVariants ? 0 : f.stock_quantity,
      };
      const invalidVariation = productVariations.find((variation) => {
        if (variation._deleted) return false;
        return !variation.name_es.trim() && !variation.name_en.trim();
      });
      if (invalidVariation) {
        throw new Error('Completa el nombre de cada variante antes de guardar el producto.');
      }
      let productId = editId;

      if (editId) {
        const { error } = await supabase.from('products').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('products').insert({ ...payload, images: [] }).select('id').single();
        if (error) throw error;
        productId = data.id;
      }

      if (productId) {
        const imageUrls: string[] = [];
        for (const item of mediaFiles) {
          if (item.isExisting) {
            imageUrls.push(item.preview);
          } else if (item.file) {
            const url = await uploadMedia(item.file, productId);
            imageUrls.push(url);
          }
        }
        const variationHasAiImage = productVariations.some((variation) => variation.images.some(isAiGeneratedProductImage));
        const hasAiImage = imageUrls.some(isAiGeneratedProductImage) || variationHasAiImage;
        const { error: imageUpdateError } = await supabase.from('products').update({ images: imageUrls }).eq('id', productId);
        if (imageUpdateError) throw imageUpdateError;

        const { data: existingProvenance, error: provenanceReadError } = await supabase
          .from('product_ai_provenance')
          .select('product_id, ai_image_generation_id, ai_image_generated_at')
          .eq('product_id', productId)
          .maybeSingle();
        if (provenanceReadError) throw provenanceReadError;
        if (hasAiImage) {
          const imageMetadata = {
            ai_image_generation_id: existingProvenance?.ai_image_generation_id || getAiImageGenerationId(imageUrls, `admin-ai-image-${productId}`),
            ai_image_generated_at: existingProvenance?.ai_image_generated_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          const { error: provenanceError } = existingProvenance
            ? await supabase.from('product_ai_provenance').update(imageMetadata).eq('product_id', productId)
            : await supabase.from('product_ai_provenance').insert({ product_id: productId, ...imageMetadata });
          if (provenanceError) throw provenanceError;
        } else if (existingProvenance) {
          const { error: provenanceError } = await supabase
            .from('product_ai_provenance')
            .update({ ai_image_generation_id: null, ai_image_generated_at: null, updated_at: new Date().toISOString() })
            .eq('product_id', productId);
          if (provenanceError) throw provenanceError;
        }
      }
      // Save variations. Always reconcile the collection so deleting the last
      // variant also removes it from the database.
      if (productId) {
        // Delete removed variations
        const existingIds = productVariations.filter(v => v.id && !v._deleted).map(v => v.id!);
        const { data: currentVars, error: currentVarsError } = await supabase.from('product_variations').select('id').eq('product_id', productId);
        if (currentVarsError) throw currentVarsError;
        const toDelete = (currentVars || []).filter(cv => !existingIds.includes(cv.id));
        for (const d of toDelete) {
          const { error: deleteVariationError } = await supabase.from('product_variations').delete().eq('id', d.id);
          if (deleteVariationError) throw deleteVariationError;
        }
        // Upsert variations
        for (const v of productVariations.filter(vr => !vr._deleted)) {
          const nameEs = v.name_es.trim() || v.name_en.trim();
          const nameEn = v.name_en.trim() || nameEs;
          const effectivePrice = v.use_manual_price && v.price_override !== null && v.price_override >= 0
            ? Number(v.price_override)
            : 0;

          const variationImageUrls: string[] = [];
          for (const image of v.images) {
            if (!image) continue;
            if (image.startsWith('blob:')) {
              const pending = v._imageFiles?.find((item) => item.preview === image);
              if (pending) variationImageUrls.push(await uploadMedia(pending.file, productId));
            } else {
              variationImageUrls.push(image);
            }
          }

          const varPayload = {
            product_id: productId,
            name_en: nameEn,
            name_es: nameEs,
            description_en: v.description_en.trim(),
            description_es: v.description_es.trim(),
            type: v.type || 'size',
            weight_grams: v.weight_grams || null,
            dimensions: v.dimensions || null,
            material_id: null,
            price_modifier: effectivePrice,
            price_override: v.use_manual_price && v.price_override !== null ? Number(v.price_override) : null,
            price_override_venezuela: v.use_manual_price && v.price_override_venezuela !== null ? Number(v.price_override_venezuela) : null,
            use_manual_price: !!v.use_manual_price,
            image_url: variationImageUrls[0] || null,
            images: variationImageUrls,
            inventory_enabled: !!v.inventory_enabled,
            stock_quantity: Math.max(0, Number(v.stock_quantity) || 0),
            low_stock_threshold: Math.max(0, Number(v.low_stock_threshold) || 0),
            value: `${v.type || 'custom'}: ${nameEs}`,
            is_active: v.is_active,
          };
          
          if (v.id && !v._isNew) {
            const { error: updateVariationError } = await supabase.from('product_variations').update(varPayload).eq('id', v.id);
            if (updateVariationError) throw updateVariationError;
          } else {
            const { error: insertVariationError } = await supabase.from('product_variations').insert(varPayload);
            if (insertVariationError) throw insertVariationError;
          }
        }

      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['admin-product-count'] });
      logActivity({
        action: editId ? 'product_updated' : 'product_created',
        category: editId ? 'edit' : 'success',
        entity_type: 'product',
        title: `${editId ? 'Editado' : 'Creado'}: ${variables.name_es || variables.name_en}`,
        metadata: { slug: variables.slug },
      });
      setOpen(false);
      setEditId(null);
      setForm(createEmptyProductForm());
      setMediaFiles([]);
      setProductVariations([]);
      toast({ title: '✓', description: 'Producto guardado.' });
    },
    onError: (e: unknown) => {
      const message = getErrorMessage(e);
      if (message !== 'Validation failed') {
        toast({ title: 'Error', description: message, variant: 'destructive' });
        logActivity({
          action: 'product_save_error',
          category: 'error',
          entity_type: 'product',
          title: 'Error guardando producto',
          details: message,
        });
      }
    },
  });

  const safelyDeleteProducts = async (productIds: string[]) => {
    const { data: orderItems, error: orderItemsError } = await supabase.from('order_items').select('product_id').in('product_id', productIds);
    if (orderItemsError) throw orderItemsError;
    const referencedProductIds = Array.from(new Set((orderItems || []).map((item) => item.product_id)));
    const { deleteIds, archiveIds } = partitionProductDeletion(productIds, referencedProductIds);
    if (deleteIds.length > 0) {
      const { error } = await supabase.from('products').delete().in('id', deleteIds);
      if (error) throw error;
    }
    if (archiveIds.length > 0) {
      const { error } = await supabase.from('products').update({ is_active: false, is_featured: false }).in('id', archiveIds);
      if (error) throw error;
    }
    return { deleteIds, archiveIds };
  };

  const del = useMutation({
    mutationFn: (id: string) => safelyDeleteProducts([id]),
    onSuccess: ({ archiveIds }, deletedId) => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['admin-product-count'] });
      logActivity({
        action: archiveIds.length > 0 ? 'product_archived' : 'product_deleted',
        category: 'edit',
        entity_type: 'product',
        entity_id: deletedId,
        title: archiveIds.length > 0 ? 'Producto archivado por historial de pedidos' : 'Producto eliminado',
      });
      toast({ title: '✓', description: 'Producto eliminado.' });
    },
  });

  const handleDeleteFromEdit = () => {
    if (!editId) return;
    del.mutate(editId, {
      onSuccess: () => {
        setDeleteFromEditOpen(false);
        setOpen(false);
        setEditId(null);
        setForm(createEmptyProductForm());
        setMediaFiles([]);
        setProductVariations([]);
      },
    });
  };

  const quickToggle = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: 'is_active' | 'is_featured'; value: boolean }) => {
      const { error } = await supabase.from('products').update({ [field]: value }).eq('id', id);
      if (error) throw error;
      return { id, field, value };
    },
    onSuccess: ({ id, field, value }) => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      logActivity({
        action: field === 'is_active' ? (value ? 'product_activated' : 'product_deactivated') : (value ? 'product_featured' : 'product_unfeatured'),
        category: 'edit',
        entity_type: 'product',
        entity_id: id,
        title: field === 'is_active' ? (value ? 'Producto activado' : 'Producto desactivado') : (value ? 'Producto destacado' : 'Producto no destacado'),
      });
    },
    onError: (e: unknown) => toast({ title: 'Error', description: getErrorMessage(e), variant: 'destructive' }),
  });

  const openEdit = (p: AdminProduct) => {
    setEditId(p.id);
    setFieldErrors({});
    setForm({
      brand: p.brand || '',
      name_en: p.name_en, name_es: p.name_es,
      description_en: p.description_en || '', description_es: p.description_es || '',
      slug: p.slug, base_price: p.base_price, venezuela_price_usd: Number(p.venezuela_price_usd ?? 0),
      venezuela_price_mode: p.venezuela_price_mode === 'manual' ? 'manual' : 'global',
      venezuela_manual_mode: p.venezuela_manual_mode === 'percentage' ? 'percentage' : 'fixed',
      venezuela_markup_percent: Number(p.venezuela_markup_percent ?? globalVenezuelaMarkupPercent),
      condition_status: p.condition_status === 'used' ? 'used' : 'new',
      seller_name: p.seller_name || 'APERFY',
      return_policy_en: p.return_policy_en || empty.return_policy_en,
      return_policy_es: p.return_policy_es || empty.return_policy_es,
      return_window_days: Number(p.return_window_days || 30),
      category_id: p.category_id || '', is_active: p.is_active, is_featured: p.is_featured,
      inventory_enabled: p.inventory_enabled, stock_quantity: p.stock_quantity, low_stock_threshold: p.low_stock_threshold,
      allows_special_notes: !!p.allows_special_notes,
    });
    const existingImages = Array.isArray(p.images) ? p.images.filter((url): url is string => typeof url === 'string') : [];
    setMediaFiles(existingImages.map((url, i) => ({
      id: `existing-${i}`,
      preview: url,
      type: getMediaTypeFromUrl(url),
      isExisting: true,
    })));
    // Load existing variations
    setLoadingVariations(true);
    supabase.from('product_variations').select('*').eq('product_id', p.id).order('created_at').then(({ data }) => {
      setProductVariations((data || []).map((v) => {
        const storedImages = Array.isArray(v.images)
          ? v.images.filter((image): image is string => typeof image === 'string' && image.length > 0)
          : [];
        const images = storedImages.length > 0 ? storedImages : (v.image_url ? [v.image_url] : []);
        return {
          id: v.id,
          name_en: v.name_en,
          name_es: v.name_es,
          description_en: v.description_en || '',
          description_es: v.description_es || '',
          type: v.type,
          weight_grams: v.weight_grams || 0,
          material_id: v.material_id || '',
          dimensions: v.dimensions || '',
          is_active: v.is_active,
          price_override: v.price_override !== null && v.price_override !== undefined ? Number(v.price_override) : null,
          price_override_venezuela: v.price_override_venezuela !== null && v.price_override_venezuela !== undefined ? Number(v.price_override_venezuela) : null,
          use_manual_price: !!v.use_manual_price,
          image_url: images[0] || null,
          images,
          inventory_enabled: !!v.inventory_enabled,
          stock_quantity: Number(v.stock_quantity || 0),
          low_stock_threshold: Number(v.low_stock_threshold ?? 3),
        };
      }));
      setLoadingVariations(false);
    });

    setOpen(true);
  };

  // ══════════════════════════════════════════════════════════
  // ── AI IMPORT FUNCTIONS ──
  // ══════════════════════════════════════════════════════════

  const resetAi = () => {
    setAiUrl('');
    setAiStep('source');
    setAiOriginalImage(null);
    setAiOriginalImageFile(null);
    setAiCustomBg(null);
    setAiCustomBgFile(null);
    setAiGeneratedImage(null);
    setAiPreviewImage(null);
    setAiStoredImageUrl(null);
    setAiStoredImagePath(null);
    setAiPersistingImage(false);
    setAiData(null);
    setAiPhotoCandidates([]);
    setAiPhotoMode(false);
    setAiPhotoImporting(false);
    setAiExtractedImages([]);
    setAiSelectedSourceImage(null);
    setAiBgMode('system_workshop');
    setShowEnglish(false);
    setSlugLocked(true);
    setNewCategoryName('');
    setCreatingCategory(false);
    setBulkMode(false);
    setBulkUrls('');
    // Clean up angle images from storage
    if (aiAngles.length > 0) {
      const paths = aiAngles.map(a => a.path).filter(Boolean);
      if (paths.length) supabase.storage.from('product-images').remove(paths).catch(() => {});
    }
    setAiAngles([]);
    setAiAnglesGenerating(false);
  };

  // Generated images are persisted by the Edge Function with service_role.
  // Never upload the AI result from the browser: product-images is protected by
  // RLS and the provider may return a temporary URL or a large data URL.
  const getPersistedAiImage = (payload: unknown): { url: string; path: string } => {
    const data = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
    const url = typeof data.composed_image_url === 'string' && data.composed_image_url
      ? data.composed_image_url
      : typeof data.generated_image === 'string' ? data.generated_image : '';
    if (!/^https:\/\//i.test(url)) {
      throw new Error('La imagen se generó, pero no se recibió una URL persistida en el almacenamiento.');
    }
    return { url, path: typeof data.image_path === 'string' ? data.image_path : '' };
  };

  const getProductImageUrls = (product: AdminProduct): string[] =>
    Array.isArray(product.images) ? product.images.filter((url): url is string => typeof url === 'string' && url.length > 0) : [];

  const refreshProductPrice = async (productId: string) => {
    const { data, error } = await supabase.functions.invoke('ai-product-import', {
      body: { action: 'refresh_price', productId },
    });
    const priceData = data?.data as Record<string, unknown> | undefined;
    if (error || !data?.success || !priceData?.updated) {
      throw new Error(await getFunctionErrorMessage(error, data, 'No se encontró un precio de mercado verificable.'));
    }
    return priceData;
  };

  const handleEditReprice = async () => {
    if (!editId || editRepricing) return;
    setEditRepricing(true);
    try {
      const priceData = await refreshProductPrice(editId);
      const suggestedPrice = Number(priceData.suggested_price);
      if (!Number.isFinite(suggestedPrice) || suggestedPrice <= 0) throw new Error('La IA no devolvió un precio válido.');
      setForm((current) => ({
        ...current,
        base_price: suggestedPrice,
        venezuela_price_usd: calculateVenezuelaUsdPrice({
          usaPrice: suggestedPrice,
          mode: current.venezuela_price_mode,
          manualMode: current.venezuela_manual_mode,
          fixedPrice: current.venezuela_price_usd,
          markupPercent: current.venezuela_markup_percent,
          globalMarkupPercent: globalVenezuelaMarkupPercent,
        }),
      }));
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      toast({ title: '✓ Precio actualizado', description: 'El precio de mercado fue guardado y quedó identificado internamente como Precio AI.' });
    } catch (error: unknown) {
      toast({ title: 'No se pudo actualizar el precio', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setEditRepricing(false);
    }
  };

  const runBulkAiOperation = async (kind: 'images' | 'reprice') => {
    if (bulkAiJob) return;
    const selectedTargets = products.filter((product) => selectedProductIds.includes(product.id));
    const targets = selectedTargets.length > 0
      ? selectedTargets
      : products.filter((product) => kind === 'images' ? !product.ai_image_generation_id : !product.ai_price_generation_id);
    if (targets.length === 0) {
      toast({
        title: selectedTargets.length > 0 ? 'No hay productos para procesar' : 'Todo está actualizado',
        description: selectedTargets.length > 0
          ? 'La selección actual no contiene productos procesables.'
          : `Todos los productos ya tienen ${kind === 'images' ? 'imagen AI registrada' : 'precio AI registrado'}.`,
      });
      return;
    }

    let completed = 0;
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];
    let rateLimitDetected = false;
    setBulkAiJob({ kind, total: targets.length, completed: 0, succeeded: 0, failed: 0, skipped: 0, currentName: targets[0].name_es || targets[0].name_en, errors: [], repriceResults: [] });

    for (const product of targets) {
      const productName = product.name_es || product.name_en || product.id;
      if (rateLimitDetected) {
        skipped += 1;
        completed += 1;
        setBulkAiJob((current) => current ? { ...current, completed, skipped, currentName: productName, errors: [...errors] } : current);
        continue;
      }
      setBulkAiJob((current) => current ? { ...current, currentName: productName } : current);
      try {
        if (kind === 'images') {
          const sourceImage = getProductImageUrls(product)[0];
          if (!sourceImage) {
            skipped += 1;
            completed += 1;
            setBulkAiJob((current) => current ? { ...current, completed, skipped } : current);
            continue;
          }

          const { data, error } = await supabase.functions.invoke('ai-product-import', {
            body: {
              action: 'generate_image',
              productId: product.id,
              persistProduct: true,
              sourceImage,
              backgroundMode: 'system_workshop',
              customBackground: systemBgSetting || undefined,
            },
          });
          if (error || !data?.success || typeof data.data?.generated_image !== 'string') {
            throw new Error(await getFunctionErrorMessage(error, data, 'La IA no devolvió una imagen válida.'));
          }
          const { url, path } = getPersistedAiImage(data.data);
          const images = getProductImageUrls(product);
          if (!data.data.product_updated) {
            const { error: updateError } = await supabase.from('products').update({ images: [url, ...images.slice(1)] }).eq('id', product.id);
            if (updateError) {
              if (path) await supabase.storage.from('product-images').remove([path]).catch(() => undefined);
              throw updateError;
            }
          }
        } else {
          const priceData = await refreshProductPrice(product.id);
          const priceResult: BulkRepriceResult = {
            name: productName,
            updated: Boolean(priceData?.updated),
            previousPrice: Number(priceData?.previous_price ?? product.base_price) || 0,
            suggestedPrice: Number(priceData?.suggested_price) || undefined,
            confidence: typeof priceData?.price_confidence === 'string' ? priceData.price_confidence : undefined,
            references: parsePriceReferences(priceData?.price_references),
          };
          setBulkAiJob((current) => current ? { ...current, repriceResults: [...current.repriceResults, priceResult] } : current);
        }
        succeeded += 1;
      } catch (error: unknown) {
        failed += 1;
        const message = getErrorMessage(error);
        errors.push(`${productName}: ${message}`);
        if (/rate|limit|solicitud|temporalmente/i.test(message)) rateLimitDetected = true;
      }
      completed += 1;
      setBulkAiJob((current) => current ? { ...current, completed, succeeded, failed, skipped, errors: [...errors] } : current);
    }

    qc.invalidateQueries({ queryKey: ['admin-products'] });
    setSelectedProductIds([]);
    setBulkAiJob((current) => current ? { ...current, currentName: '' } : current);
    toast({
      title: kind === 'images' ? 'Regeneración de imágenes completada' : 'Reprice completado',
      description: `${succeeded} completado(s), ${skipped} omitido(s), ${failed} con error.${rateLimitDetected ? ' El proveedor limitó solicitudes; los restantes no se reintentaron.' : ''}`,
      variant: failed > 0 ? 'destructive' : 'default',
    });
    window.setTimeout(() => setBulkAiJob(null), kind === 'reprice' ? 10000 : 1800);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const triggerAiGenerateImage = async (sourceImg: string) => {
    if (aiImageLoading || aiPersistingImage) {
      toast({ title: 'Generación en curso', description: 'Espera a que termine la solicitud actual antes de volver a intentarlo.' });
      return;
    }

    let customBackground: string | undefined;
    if (aiBgMode === 'system_workshop' && systemBgSetting) {
      customBackground = systemBgSetting;
    } else if (aiBgMode === 'custom' && aiCustomBg) {
      customBackground = aiCustomBg;
    }

    setAiImageLoading(true);
    setAiPersistingImage(true);
    // Delete previous temp image if regenerating
    if (aiStoredImagePath) {
      supabase.storage.from('product-images').remove([aiStoredImagePath]).catch(() => {});
    }
    setAiStoredImageUrl(null);
    setAiStoredImagePath(null);
    try {
      const { data, error } = await supabase.functions.invoke('ai-product-import', {
        body: {
          action: 'generate_image',
          sourceImage: sourceImg,
          customBackground,
          backgroundMode: aiBgMode,
        },
      });
      if (error) throw new Error(await getFunctionErrorMessage(error, data, 'Error al generar imagen'));
      if (!data?.success) throw new Error(data?.error || 'Error al generar imagen');
      
      const { url, path } = getPersistedAiImage(data.data);
      setAiGeneratedImage(url);
      setAiPreviewImage(url);
      setAiStoredImageUrl(url);
      setAiStoredImagePath(path || null);

      toast({ title: '✓', description: '¡Imagen AI generada!' });
    } catch (e: unknown) {
      toast({ title: 'Error generando imagen', description: getErrorMessage(e), variant: 'destructive' });
      logActivity({
        action: 'ai_image_error',
        category: 'error',
        entity_type: 'product',
        title: 'Error generando imagen AI',
        details: getErrorMessage(e),
        metadata: { backgroundMode: aiBgMode },
      });
    } finally {
      setAiImageLoading(false);
      setAiPersistingImage(false);
    }
  };

  const ANGLE_LABELS: Record<string, string> = {
    three_quarter: '3/4 hero',
    side: 'Lateral',
    back: 'Trasera',
    top: 'Cenital',
    macro: 'Macro',
    lifestyle: 'Lifestyle',
  };

  const handleGenerateAngles = async (selected: string[]) => {
    if (!aiStoredImageUrl) {
      toast({ title: 'Genera primero la imagen principal', variant: 'destructive' });
      return;
    }
    if (selected.length === 0) return;
    setAiAnglesGenerating(true);

    // Seed placeholders so the user sees them appear
    const seeds: AiAngle[] = selected.map(a => ({ url: '', path: '', angle: a, loading: true }));
    setAiAngles(prev => [...prev, ...seeds]);

    // Keep provider image requests sequential. Parallel generations commonly
    // trip provider rate limits and leave the editor in a misleading loading state.
    for (const angle of selected) {
      try {
        const { data, error } = await supabase.functions.invoke('ai-product-import', {
          body: { action: 'generate_angle', sourceImage: aiStoredImageUrl, angle },
        });
        if (error || !data?.success) throw new Error(await getFunctionErrorMessage(error, data, 'Error al generar ángulo'));
        const { url, path } = getPersistedAiImage(data.data);
        setAiAngles(prev => prev.map(a =>
          a.angle === angle && a.loading ? { ...a, url, path, loading: false } : a
        ));
      } catch (e: unknown) {
        setAiAngles(prev => prev.map(a =>
          a.angle === angle && a.loading ? { ...a, loading: false, error: getErrorMessage(e) } : a
        ));
        toast({ title: `Error en ángulo ${ANGLE_LABELS[angle] || angle}`, description: getErrorMessage(e), variant: 'destructive' });
      }
    }

    setAiAnglesGenerating(false);
  };

  const removeAiAngle = (angleKey: string, url: string) => {
    setAiAngles(prev => {
      const target = prev.find(a => a.angle === angleKey && a.url === url);
      if (target?.path) {
        supabase.storage.from('product-images').remove([target.path]).catch(() => {});
      }
      return prev.filter(a => !(a.angle === angleKey && a.url === url));
    });
  };


  const handleAiScrape = async () => {
    if (aiLoading || aiImageLoading || aiPersistingImage) {
      toast({ title: 'Importación en curso', description: 'Espera a que termine la operación de IA actual.' });
      return;
    }
    if (!aiUrl) {
      toast({ title: 'Ingresa una URL', variant: 'destructive' });
      return;
    }
    const sanitized = sanitizeUrl(aiUrl);
    if (!sanitized) {
      toast({ title: 'Formato de URL inválido', variant: 'destructive' });
      return;
    }

    setAiStep('loading');
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-product-import', {
        body: {
          action: 'scrape',
          url: sanitized,
           existingCategories: categories.map((c) => ({ slug: c.slug, name_en: c.name_en, name_es: c.name_es })),
           discountPercent: aiDiscountPercent,
        },
      });
      if (error) throw new Error(await getFunctionErrorMessage(error, data, 'No se pudo extraer el producto'));
      if (!data?.success) throw new Error(data?.error || 'Error al extraer datos');

      setAiPhotoMode(false);
      setAiPhotoCandidates([]);
      let importedData = { ...data.data };
      const spanishNeedsReview = !String(importedData.name_es || '').trim()
        || !String(importedData.description_es || '').trim()
        || (String(importedData.name_en || '').trim() && String(importedData.name_es || '').trim().toLocaleLowerCase() === String(importedData.name_en || '').trim().toLocaleLowerCase())
        || (String(importedData.description_en || '').trim() && String(importedData.description_es || '').trim().toLocaleLowerCase() === String(importedData.description_en || '').trim().toLocaleLowerCase());
      if (spanishNeedsReview && (importedData.name_en || importedData.description_en)) {
        try {
          const translated = await translateEnglishToSpanish(String(importedData.name_en || ''), String(importedData.description_en || ''));
          if (translated) importedData = { ...importedData, ...translated };
        } catch {
          toast({ title: 'Revisa el español', description: 'La ficha se importó, pero puedes usar el botón “Español” para traducir estos campos.' });
        }
      }
      setAiData({ ...importedData, market_reference_price: importedData.suggested_price, suggested_price: suggestRetailPrice(Number(importedData.suggested_price || 0), aiDiscountPercent), discount_percent: aiDiscountPercent });
      setAiExtractedImages(importedData.extracted_images || []);

      // Determine best source image: manual upload > AI reference > first extracted
      const bestImage = aiOriginalImage || importedData.reference_image_url || importedData.extracted_images?.[0] || null;
      if (!aiOriginalImage) {
        setAiSelectedSourceImage(bestImage);
      }
      setAiStep('review');

      // Auto-trigger image generation with the resolved source image directly
      if (bestImage) {
        triggerAiGenerateImage(bestImage);
      }
    } catch (e: unknown) {
      toast({ title: 'Error', description: getErrorMessage(e), variant: 'destructive' });
      setAiStep('source');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiGenerateImage = async () => {
    if (aiLoading || aiImageLoading || aiPersistingImage) {
      toast({ title: 'Generación en curso', description: 'Espera a que termine la solicitud actual antes de volver a intentarlo.' });
      return;
    }
    const sourceImage = aiOriginalImage || aiSelectedSourceImage;
    if (!sourceImage) {
      toast({ title: 'No hay imagen fuente disponible', variant: 'destructive' });
      return;
    }
    await triggerAiGenerateImage(sourceImage);
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.length === 0) return;
    setBulkDeleting(true);
    try {
      const deletedCount = selectedProductIds.length;
      const { deleteIds, archiveIds } = await safelyDeleteProducts(selectedProductIds);
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['admin-product-count'] });
      logActivity({
        action: 'products_bulk_deleted',
        category: 'edit',
        entity_type: 'product',
        title: `${deleteIds.length} productos eliminados, ${archiveIds.length} archivados`,
        metadata: { product_ids: selectedProductIds, deleted_ids: deleteIds, archived_ids: archiveIds },
      });
      setSelectedProductIds([]);
      setBulkDeleteOpen(false);
      toast({ title: '✓', description: `${deletedCount} producto(s) eliminado(s).` });
    } catch (e: unknown) {
      toast({ title: 'Error', description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleProductViewChange = (mode: ProductViewMode) => {
    setProductViewMode(mode);
    window.localStorage.setItem('admin-products-view', mode);
  };

  const handleAiImportPhotoCandidates = async () => {
    const selected = aiPhotoCandidates.filter((candidate) => candidate.selected);
    if (!aiOriginalImage || selected.length === 0) {
      toast({ title: 'Selecciona al menos un producto', description: 'Marca los productos que quieres importar.', variant: 'destructive' });
      return;
    }
    setAiPhotoImporting(true);
    try {
      const imageSource = selected.length === 1 && aiStoredImageUrl ? aiStoredImageUrl : aiOriginalImage;
      const localizedProducts = [];
      for (const candidate of selected) {
        let localized = {
          ...candidate,
          name_en: candidate.name,
          description_en: candidate.description,
          name_es: candidate.name_es || candidate.name,
          description_es: candidate.description_es || candidate.description,
        };
        if (!candidate.name_es || !candidate.description_es) {
          try {
            const translated = await translateEnglishToSpanish(candidate.name, candidate.description);
            if (translated) localized = { ...localized, ...translated };
          } catch {
            // The importer still works with the detected text if translation is unavailable.
          }
        }
        localizedProducts.push(localized);
      }
      const { data, error } = await supabase.functions.invoke('ai-product-from-photo', {
        body: {
          action: 'import_products',
          imageData: aiOriginalImage,
          imageSource,
          products: localizedProducts.map(({ selected: _selected, ...candidate }) => candidate),
          globalMarkupPercent: globalVenezuelaMarkupPercent,
        },
      });
      if (error || !data?.success) throw new Error(await getFunctionErrorMessage(error, data, 'No se pudieron importar los productos detectados'));
      const created = Array.isArray(data.data?.created) ? data.data.created.length : selected.length;
      const failed = Array.isArray(data.data?.errors) ? data.data.errors.length : 0;
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['admin-product-count'] });
      await logActivity({
        action: 'ai_photo_import_complete',
        category: failed > 0 ? 'error' : 'import',
        entity_type: 'product',
        title: `Importación desde imagen: ${created} creados`,
        details: failed > 0 ? `${failed} producto(s) no pudieron importarse.` : 'Productos detectados e imagen original guardada en Storage.',
        metadata: { created, failed },
      });
      setAiOpen(false);
      resetAi();
      toast({ title: '✓ Importación desde imagen completada', description: `${created} producto(s) creados${failed ? `, ${failed} con error` : ''}.`, variant: failed > 0 ? 'destructive' : 'default' });
    } catch (error: unknown) {
      toast({ title: 'Error importando desde imagen', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setAiPhotoImporting(false);
    }
  };

  const handleAiPhotoAnalyze = async () => {
    if (aiLoading || aiImageLoading || aiPersistingImage) {
      toast({ title: 'Análisis en curso', description: 'Espera a que termine la operación de IA actual.' });
      return;
    }
    if (!aiOriginalImage) {
      toast({ title: 'SUBE UNA FOTO DEL PRODUCTO', variant: 'destructive' });
      return;
    }
    setAiStep('loading');
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-product-from-photo', {
        // Image import is explicitly an identification/search workflow. The
        // function still degrades to the vision estimate when Firecrawl is not
        // configured, but it should not silently skip the lookup.
        body: { imageData: aiOriginalImage, discountPercent: aiDiscountPercent, searchEnabled: true },
      });
      if (error) throw new Error(await getFunctionErrorMessage(error, data, 'No se pudo extraer el producto'));
      if (!data?.success) throw new Error(data?.error || 'NO SE PUDO ANALIZAR LA FOTO');
      const rawProducts = Array.isArray(data.data?.products) ? data.data.products : [data.data];
      const candidates: AiPhotoCandidate[] = rawProducts.slice(0, 8).map((product: Record<string, unknown>, index: number) => ({
        id: typeof product.id === 'string' ? product.id : `photo-${index + 1}`,
        name: typeof product.name === 'string' ? product.name : `Producto detectado ${index + 1}`,
        brand: typeof product.brand === 'string' ? product.brand : '',
        model: typeof product.model === 'string' ? product.model : '',
        category: typeof product.category === 'string' ? product.category : '',
        description: typeof product.description === 'string' ? product.description : '',
        attributes: Array.isArray(product.attributes) ? product.attributes.filter((item): item is string => typeof item === 'string') : [],
        search_query: typeof product.search_query === 'string' ? product.search_query : '',
        market_reference_price: Number(product.market_reference_price) || 0,
        suggested_price: Number(product.suggested_price) || 0,
        confidence: product.confidence === 'high' || product.confidence === 'medium' ? product.confidence : 'low',
        market_sources: Array.isArray(product.market_sources) ? product.market_sources : [],
        price_source: typeof product.price_source === 'string' ? product.price_source : undefined,
        matched_listings_count: Number(product.matched_listings_count) || 0,
        selected: true,
      }));
      const first = candidates[0];
      if (!first) throw new Error('La IA no identificó productos claros en la imagen.');
      let photoNameEs = first.name;
      let photoDescriptionEs = first.description;
      try {
        const translated = await translateEnglishToSpanish(first.name, first.description);
        if (translated) {
          photoNameEs = translated.name_es || photoNameEs;
          photoDescriptionEs = translated.description_es || photoDescriptionEs;
        }
      } catch {
        toast({ title: 'Revisa el español', description: 'La ficha fue detectada, pero puedes usar el botón “Español” antes de importarla.' });
      }
      setAiPhotoCandidates(candidates);
      setAiPhotoMode(true);
      setAiData({
        ...first,
        name_es: photoNameEs,
        name_en: first.name,
        description_es: photoDescriptionEs,
        description_en: first.description,
        slug: slugify(first.name),
        suggested_category: slugify(first.category),
        colors: [],
        materials: first.attributes,
      });
      setAiSelectedSourceImage(aiOriginalImage);
      setAiStep('review');
    } catch (e: unknown) {
      toast({ title: 'ERROR DE ANÁLISIS', description: getErrorMessage(e), variant: 'destructive' });
      setAiStep('source');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiOriginalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    setAiOriginalImage(b64);
    setAiOriginalImageFile(file);
    setAiSelectedSourceImage(null);
    setAiPhotoCandidates([]);
    setAiPhotoMode(false);
  };

  const handleAiClipboardPaste = async () => {
    const clipboard = navigator.clipboard;
    if (!clipboard?.read) {
      toast({ title: 'Portapapeles no disponible', description: 'Usa “Subir desde galería / archivos” para seleccionar la imagen.', variant: 'destructive' });
      return;
    }

    try {
      const file = await readClipboardImage(() => clipboard.read());
      if (!file) {
        toast({ title: 'No hay una imagen en el portapapeles', description: 'Copia una imagen y vuelve a intentarlo.', variant: 'destructive' });
        return;
      }
      const b64 = await fileToBase64(file);
      setAiOriginalImage(b64);
      setAiOriginalImageFile(file);
      setAiSelectedSourceImage(null);
      setAiPhotoCandidates([]);
      setAiPhotoMode(false);
      toast({ title: 'Imagen pegada', description: 'La imagen del portapapeles está lista para analizar.' });
    } catch (error: unknown) {
      console.error('Clipboard image read failed:', error);
      toast({ title: 'No se pudo leer el portapapeles', description: 'Concede permiso al navegador o usa la selección desde galería / archivos.', variant: 'destructive' });
    }
  };

  const handleAiBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    setAiCustomBg(b64);
    setAiCustomBgFile(file);
  };

  const handleTranslateToEnglish = async () => {
    if (!aiData?.name_es && !aiData?.description_es) return;
    setTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-product-import', {
        body: { action: 'translate', direction: 'es_to_en', name_es: aiData.name_es, description_es: aiData.description_es },
      });
      if (error) throw new Error(await getFunctionErrorMessage(error, data, 'No se pudo generar la traducción'));
      if (!data?.success) throw new Error(data?.error || 'No se pudo generar la traducción');
      const newNameEn = data.data.name_en;
      setAiData((prev) => {
        const updated = { ...prev, name_en: newNameEn, description_en: data.data.description_en };
        // Regenerate slug from English name if English mode is on and slug is locked
        if (showEnglish && slugLocked && newNameEn) {
          updated.slug = slugify(newNameEn);
        }
        return updated;
      });
      toast({ title: '✓', description: 'Traducción generada' });
    } catch (e: unknown) {
      toast({ title: 'Error', description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setTranslating(false);
    }
  };

  const translateEnglishToSpanish = async (nameEn: string, descriptionEn: string) => {
    if (!nameEn && !descriptionEn) return null;
    const { data, error } = await supabase.functions.invoke('ai-product-import', {
      body: { action: 'translate', direction: 'en_to_es', name_en: nameEn, description_en: descriptionEn },
    });
    if (error) throw new Error(await getFunctionErrorMessage(error, data, 'No se pudo generar la versión en español'));
    if (!data?.success || !data.data) throw new Error(data?.error || 'No se pudo generar la versión en español');
    return {
      name_es: typeof data.data.name_es === 'string' ? data.data.name_es : '',
      description_es: typeof data.data.description_es === 'string' ? data.data.description_es : '',
    };
  };

  const handleTranslateToSpanish = async () => {
    if (!aiData?.name_en && !aiData?.description_en) return;
    setTranslating(true);
    try {
      const translated = await translateEnglishToSpanish(aiData.name_en || '', aiData.description_en || '');
      if (!translated) return;
      setAiData((prev) => prev ? ({
        ...prev,
        name_es: translated.name_es || prev.name_es,
        description_es: translated.description_es || prev.description_es,
      }) : prev);
      toast({ title: '✓', description: 'Versión en español generada' });
    } catch (e: unknown) {
      toast({ title: 'Error', description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setTranslating(false);
    }
  };

  // ── Edit Dialog AI Functions ──
  const handleEditAiSourceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    setEditAiSourceImage(b64);
    e.target.value = '';
  };

  const handleUseMainImageForAi = async () => {
    const mainImage = mediaFiles[0];
    if (!mainImage || mainImage.type === 'video') {
      toast({ title: 'La portada debe ser una imagen', description: 'Sube o selecciona una imagen principal para usarla como referencia.', variant: 'destructive' });
      return;
    }

    setEditAiSourceSyncing(true);
    try {
      setEditAiSourceImage(mainImage.file ? await fileToBase64(mainImage.file) : mainImage.preview);
    } catch (error: unknown) {
      toast({ title: 'No se pudo cargar la portada', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setEditAiSourceSyncing(false);
    }
  };

  const toggleEditAiImageGenerator = () => {
    const nextOpen = !editAiImageOpen;
    setEditAiImageOpen(nextOpen);
    if (nextOpen && !editAiSourceImage) void handleUseMainImageForAi();
  };

  const handleEditAiBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    setEditAiCustomBg(b64);
  };

  const handleEditAiGenerateImage = async () => {
    if (editAiGenerating || editEnhancing) {
      toast({ title: 'Generación en curso', description: 'Espera a que termine la solicitud actual antes de volver a intentarlo.' });
      return;
    }
    if (!editAiSourceImage) {
      toast({ title: 'Sube una foto del producto primero', variant: 'destructive' });
      return;
    }

    let customBackground: string | undefined;
    if (editAiBgMode === 'system_workshop' && systemBgSetting) {
      customBackground = systemBgSetting;
    } else if (editAiBgMode === 'custom' && editAiCustomBg) {
      customBackground = editAiCustomBg;
    }

    setEditAiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-product-import', {
        body: {
          action: 'generate_image',
          sourceImage: editAiSourceImage,
          customBackground,
          backgroundMode: editAiBgMode,
        },
      });
      if (error) throw new Error(await getFunctionErrorMessage(error, data, 'Error al generar imagen'));
      if (!data?.success) throw new Error(data?.error || 'Error al generar imagen');

      const { url } = getPersistedAiImage(data.data);
      
      // Add to media files
      setMediaFiles(prev => [...prev.slice(0, MAX_MEDIA - 1), {
        id: `ai-edit-${Date.now()}`,
        preview: url,
        type: 'image' as const,
        isExisting: true,
      }]);

      setEditAiImageOpen(false);
      setEditAiSourceImage(null);
      toast({ title: '✓', description: '¡Imagen AI generada y agregada!' });
    } catch (e: unknown) {
      const errorMessage = getErrorMessage(e, 'Error desconocido');
      toast({ title: 'Error generando imagen', description: errorMessage, variant: 'destructive' });
      await logActivity({
        action: 'ai_image_generation_failed',
        category: 'error',
        entity_type: 'product',
        title: 'Error generando imagen AI (edición)',
        details: errorMessage,
        metadata: { product_name: form.name_es },
      });
    } finally {
      setEditAiGenerating(false);
    }
  };

  const handleEditEnhanceWithAi = async () => {
    if (editEnhancing || editAiGenerating) return;
    setEditEnhancing(true);
    try {
      // Get first image URL for context
      const firstImage = mediaFiles[0]?.preview || null;
      
      const { data, error } = await supabase.functions.invoke('ai-product-import', {
        body: {
          action: 'enhance_product',
          name_es: form.name_es,
          description_es: form.description_es,
          existingCategories: categories.map((c) => ({ slug: c.slug, name_en: c.name_en, name_es: c.name_es })),
          imageUrl: firstImage,
        },
      });
      if (error) throw new Error(await getFunctionErrorMessage(error, data, 'No se pudo mejorar el producto'));
      if (!data?.success) throw new Error(data?.error || 'Error');

      let enhanced = data.data;
      const enhancedSpanishNeedsReview = !String(enhanced.name_es || '').trim()
        || !String(enhanced.description_es || '').trim()
        || (String(enhanced.name_en || '').trim() && String(enhanced.name_es || '').trim().toLocaleLowerCase() === String(enhanced.name_en || '').trim().toLocaleLowerCase())
        || (String(enhanced.description_en || '').trim() && String(enhanced.description_es || '').trim().toLocaleLowerCase() === String(enhanced.description_en || '').trim().toLocaleLowerCase());
      if (enhancedSpanishNeedsReview && (enhanced.name_en || enhanced.description_en)) {
        try {
          const translated = await translateEnglishToSpanish(String(enhanced.name_en || ''), String(enhanced.description_en || ''));
          if (translated) enhanced = { ...enhanced, ...translated };
        } catch {
          // The editor remains usable and exposes the manual Spanish action below.
        }
      }
      const matchedCat = categories.find((c) => c.slug === enhanced.suggested_category);

      setForm(prev => ({
        ...prev,
        brand: enhanced.brand || prev.brand,
        name_es: enhanced.name_es || prev.name_es,
        name_en: enhanced.name_en || prev.name_en,
        description_es: enhanced.description_es || prev.description_es,
        description_en: enhanced.description_en || prev.description_en,
        slug: enhanced.slug || prev.slug,
        category_id: matchedCat?.id || prev.category_id,
      }));
      toast({ title: '✓', description: 'Producto mejorado con AI' });
    } catch (e: unknown) {
      toast({ title: 'Error', description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setEditEnhancing(false);
    }
  };

  const handleEditTranslateToEnglish = async () => {
    if (!form.name_es && !form.description_es) return;
    setEditTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-product-import', {
        body: { action: 'translate', direction: 'es_to_en', name_es: form.name_es, description_es: form.description_es },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'No se pudo generar la traducción');
      setForm(prev => ({
        ...prev,
        name_en: data.data.name_en,
        description_en: data.data.description_en,
        slug: slugify(data.data.name_en),
      }));
      toast({ title: '✓', description: 'Traducción generada' });
    } catch (e: unknown) {
      toast({ title: 'Error', description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setEditTranslating(false);
    }
  };

  const handleEditTranslateToSpanish = async () => {
    if (!form.name_en && !form.description_en) return;
    setEditTranslating(true);
    try {
      const translated = await translateEnglishToSpanish(form.name_en, form.description_en);
      if (!translated) return;
      setForm((prev) => ({
        ...prev,
        name_es: translated.name_es || prev.name_es,
        description_es: translated.description_es || prev.description_es,
      }));
      toast({ title: '✓', description: 'Versión en español generada' });
    } catch (e: unknown) {
      toast({ title: 'Error', description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setEditTranslating(false);
    }
  };

  const handleEditVariationTranslate = async (idx: number) => {
    const variation = productVariations[idx];
    if (!variation) return;
    const translationPayload = getVariationTranslationPayload(variation);
    if (!translationPayload) {
      toast({ title: 'Completa un nombre o descripción primero', variant: 'destructive' });
      return;
    }

    setProductVariations(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], _translating: true };
      return updated;
    });

    try {
      const { data, error } = await supabase.functions.invoke('ai-product-import', {
        body: { action: 'translate', ...translationPayload },
      });
      if (error) throw new Error(await getFunctionErrorMessage(error, data, 'No se pudo generar los textos de la variante'));
      if (!data?.success || !data.data) throw new Error(data?.error || 'No se pudo generar los textos de la variante');

      setProductVariations(prev => {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          name_en: typeof data.data.name_en === 'string' ? data.data.name_en : updated[idx].name_en,
          description_en: typeof data.data.description_en === 'string' ? data.data.description_en : updated[idx].description_en,
          name_es: typeof data.data.name_es === 'string' ? data.data.name_es : updated[idx].name_es,
          description_es: typeof data.data.description_es === 'string' ? data.data.description_es : updated[idx].description_es,
          _translating: false,
        };
        return updated;
      });
      toast({ title: '✓', description: 'Nombre y descripción de la variante generados' });
    } catch (e: unknown) {
      toast({ title: 'Error generando textos', description: getErrorMessage(e), variant: 'destructive' });
      setProductVariations(prev => {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], _translating: false };
        return updated;
      });
    }
  };

  const handleCreateCategory = async (requestedName = newCategoryName, target: 'ai' | 'form' = 'ai') => {
    const categoryName = requestedName.trim();
    if (!categoryName) return;
    setCreatingCategory(true);
    try {
      const catSlug = slugify(categoryName);
      const { data, error } = await supabase.from('categories').insert({
        name_es: categoryName,
        name_en: categoryName,
        slug: catSlug,
        is_active: true,
      }).select().single();
      if (error) throw error;
      qc.setQueryData(['admin-categories'], (current: CategoryOption[] | undefined) =>
        [...(current || []), data as CategoryOption].sort((a, b) => a.name_es.localeCompare(b.name_es, 'es', { sensitivity: 'base' })),
      );
      if (target === 'ai') {
        setAiData((prev) => prev ? ({ ...prev, suggested_category: data.slug }) : prev);
      } else {
        setForm((prev) => ({ ...prev, category_id: data.id }));
      }
      setNewCategoryName('');
      toast({ title: '✓', description: 'Categoría creada' });
    } catch (e: unknown) {
      toast({ title: 'Error', description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleAiSaveProduct = async () => {
    if (!aiData) return;
    if (aiPersistingImage) {
      toast({ title: 'Espera', description: 'La imagen aún se está guardando...', variant: 'destructive' });
      return;
    }
    const matchedCat = categories.find((c) => c.slug === aiData.suggested_category);

    const nameEn = aiData.name_en || aiData.name_es;
    const descEn = aiData.description_en || aiData.description_es;
    const importedBasePrice = Number(aiData.suggested_price || 0);

    setForm({
      brand: aiData.brand || '',
      name_en: nameEn,
      name_es: aiData.name_es || '',
      description_en: descEn,
      description_es: aiData.description_es || '',
      slug: aiData.slug || slugify(aiData.name_es || ''),
      base_price: importedBasePrice,
      venezuela_price_usd: calculateVenezuelaUsdPrice({
        usaPrice: importedBasePrice,
        mode: 'global',
        manualMode: 'fixed',
        fixedPrice: 0,
        globalMarkupPercent: globalVenezuelaMarkupPercent,
      }),
      venezuela_price_mode: 'global',
      venezuela_manual_mode: 'fixed',
      venezuela_markup_percent: globalVenezuelaMarkupPercent,
      condition_status: 'new',
      seller_name: empty.seller_name,
      return_policy_en: empty.return_policy_en,
      return_policy_es: empty.return_policy_es,
      return_window_days: empty.return_window_days,
      category_id: matchedCat?.id || '',
      is_active: true,
      is_featured: false,
      inventory_enabled: false,
      stock_quantity: 0,
      low_stock_threshold: 3,
    });

    // Build media list: primary AI image + generated angles (cap respect handled downstream)
    const angleItems: MediaItem[] = aiAngles
      .filter(a => a.url && !a.loading && !a.error)
      .slice(0, Math.max(0, MAX_MEDIA - 1))
      .map((a, idx) => ({
        id: `ai-angle-${idx}-${Date.now()}`,
        preview: a.url,
        type: 'image' as const,
        isExisting: true,
      }));

    const primaryAiImage = aiStoredImageUrl || (aiGeneratedImage && /^https:\/\//i.test(aiGeneratedImage) ? aiGeneratedImage : null);
    if (primaryAiImage) {
      setMediaFiles([
        { id: `ai-${Date.now()}`, preview: primaryAiImage, type: 'image', isExisting: true },
        ...angleItems,
      ]);
    } else if (angleItems.length > 0) {
      setMediaFiles(angleItems);
    } else {
      setMediaFiles([]);
    }

    // Turn the colors selected/recognized in AI Import Studio into editable
    // variant rows. The user can then upload a photo for each one and generate
    // an AI studio image from that specific photo in the Variants step.
    const aiColors = Array.from(new Set((aiData.colors || []).map((color) => color.trim()).filter(Boolean)));
    setProductVariations(aiColors.map((color) => createEmptyVariation({
      name_es: color,
      name_en: color,
      type: 'color',
    })));

    setAiOpen(false);
    // Clear angle list BEFORE reset so the cleanup loop doesn't remove the storage objects we just attached.
    setAiAngles([]);
    resetAi();
    setOpen(true);
    toast({ title: '✓', description: 'Datos AI cargados. Revisa y guarda.' });
  };

  const removeExtractedImage = (index: number) => {
    setAiExtractedImages(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (aiSelectedSourceImage === prev[index]) {
        setAiSelectedSourceImage(updated[0] || null);
      }
      return updated;
    });
  };

  // ── BULK IMPORT (delegated to global context) ──
  const { startBulkImport, isRunning: bulkImportRunning } = useBulkImport();

  const handleBulkImport = () => {
    const urls = bulkUrls.split('\n').map(u => u.trim()).filter(u => u && isValidUrl(u));
    if (urls.length === 0) {
      toast({ title: 'Ingresa al menos una URL válida', variant: 'destructive' });
      return;
    }
    if (urls.length > 10) {
      toast({ title: 'Máximo 10 URLs permitidas', variant: 'destructive' });
      return;
    }
    startBulkImport(urls, categories, systemBgSetting || null, globalVenezuelaMarkupPercent);
    setAiOpen(false);
    resetAi();
    toast({ title: '🚀 Importación iniciada', description: 'Puedes seguir navegando. Verás el progreso en el banner inferior.' });
  };

  function isValidUrl(str: string): boolean {
    try {
      const u = new URL(str);
      return ['http:', 'https:'].includes(u.protocol);
    } catch { return false; }
  }

  // ══════════════════════════════════════════════════════════
  // ── RENDER ──
  // ══════════════════════════════════════════════════════════

  return (
    <div className="max-w-[1400px] mx-auto">
      <AdminPageHeader
        eyebrow="catalog · products"
        title="Productos"
        actions={
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => void runBulkAiOperation('images')}
            disabled={Boolean(bulkAiJob)}
            className="min-h-11 flex-1 gap-2 border-primary/30 text-primary hover:bg-primary/10 sm:flex-none"
            title={selectedProductIds.length > 0 ? 'Regenera la imagen principal de los productos seleccionados usando el fondo APERFY' : 'Sin selección, regenera únicamente productos sin una imagen AI registrada'}
          >
            {bulkAiJob?.kind === 'images' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Regenerar imágenes
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void runBulkAiOperation('reprice')}
            disabled={Boolean(bulkAiJob)}
            className="min-h-11 flex-1 gap-2 border-primary/30 text-primary hover:bg-primary/10 sm:flex-none"
            title={selectedProductIds.length > 0 ? 'Busca precios de mercado para los productos seleccionados' : 'Sin selección, busca precios únicamente para productos sin Precio AI registrado'}
          >
            {bulkAiJob?.kind === 'reprice' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Reprice
          </Button>
          {/* AI Import Studio Button */}
          <Dialog open={aiOpen} onOpenChange={(o) => { setAiOpen(o); if (!o) resetAi(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="min-h-11 flex-1 gap-2 border-primary/30 text-primary hover:bg-primary/10 sm:flex-none">
                <Sparkles className="w-4 h-4" />
                AI Import Studio
              </Button>
            </DialogTrigger>
            <DialogContent className="flex h-[min(900px,90vh)] max-h-[90vh] max-w-4xl flex-col overflow-hidden bg-card border-border p-0">
              <div className="shrink-0 p-6 pb-0">
                <DialogHeader>
                  <DialogTitle className="font-display flex items-center gap-2 text-xl">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-primary-foreground" />
                    </div>
                    AI Import Studio
                  </DialogTitle>
                </DialogHeader>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-6 pt-4">
                {/* ── STEP: SOURCE ── */}
                {aiStep === 'source' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <Tabs value={bulkMode ? 'bulk' : 'single'} onValueChange={(v) => setBulkMode(v === 'bulk')}>
                      <TabsList className="w-full">
                        <TabsTrigger value="single" className="flex-1 gap-2"><Link2 className="w-3 h-3" /> URL única</TabsTrigger>
                        <TabsTrigger value="bulk" className="flex-1 gap-2"><List className="w-3 h-3" /> Lote (hasta 10)</TabsTrigger>
                      </TabsList>

                      <TabsContent value="single" className="space-y-6 mt-4">
                    <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-semibold">
                          <Link2 className="w-4 h-4 text-primary" />
                          URL de referencia
                        </Label>
                        <Input
                          value={aiUrl}
                          onChange={(e) => setAiUrl(e.target.value)}
                           placeholder="https://example.com/product/..."
                          className="bg-background"
                          maxLength={2000}
                        />
                        <p className="text-xs text-muted-foreground">Añade enlaces de referencia para enriquecer la ficha del producto.</p>
                      </div>
                    </div>

                    {/* Background Mode Selector — Card Style */}
                    <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-4">
                         <Label className="flex items-center gap-2 text-sm font-semibold uppercase">
                        <Image className="w-4 h-4 text-primary" />
                        Fondo para imagen AI
                      </Label>
                      <RadioGroup value={aiBgMode} onValueChange={(v) => setAiBgMode(v)} className="space-y-3">
                        {[
                          { value: 'system_workshop', label: 'APERFY Studio', desc: 'Superficie graphite, luz de catálogo y acento verde para destacar cualquier producto', badge: 'Recomendado' },
                          { value: 'system_macro', label: 'APERFY Macro', desc: 'Enfoque cercano, bokeh suave y detalle nítido del producto' },
                          { value: 'system_dark_premium', label: 'APERFY Dark Premium', desc: 'Atmósfera tecnológica oscura con rim light frío y acento verde' },
                          { value: 'custom', label: 'Custom Background', desc: 'Sube tu propia imagen de fondo' },
                          { value: 'premium_tech_plinth', label: 'Tech Plinth', desc: 'Base graphite minimalista con geometría sutil y luz verde APERFY' },
                        ].map((opt) => (
                          <div
                            key={opt.value}
                            onClick={() => setAiBgMode(opt.value)}
                            className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:border-primary/50 ${aiBgMode === opt.value ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(212,160,23,0.1)]' : 'border-border bg-background'}`}
                          >
                            <RadioGroupItem value={opt.value} id={`bg-${opt.value}`} className="sr-only" />
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${aiBgMode === opt.value ? 'border-primary' : 'border-muted-foreground'}`}>
                                {aiBgMode === opt.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm">{opt.label}</span>
                                  {opt.badge && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary">{opt.badge}</span>}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </RadioGroup>

                      <AnimatePresence>
                        {aiBgMode === 'custom' && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <div className="pt-2">
                              {aiCustomBg ? (
                                <div className="relative inline-block">
                                  <img src={aiCustomBg} alt="Background" className="w-32 h-20 object-cover rounded-lg" />
                                  <button onClick={() => { setAiCustomBg(null); setAiCustomBgFile(null); }} className="absolute top-1 right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"><X className="w-3 h-3 text-white" /></button>
                                </div>
                              ) : (
                                <button onClick={() => aiBgInputRef.current?.click()} className="w-32 h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors">
                                  <Upload className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">Subir</span>
                                </button>
                              )}
                              <input ref={aiBgInputRef} type="file" accept="image/*" onChange={handleAiBgUpload} className="hidden" />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Original Product Photo */}
                    <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-3">
                         <Label className="flex items-center gap-2 text-sm font-semibold uppercase">
                        <ImagePlus className="w-4 h-4 text-primary" />
                        Foto original del producto (opcional)
                      </Label>
                      <p className="text-xs text-muted-foreground">Sube la imagen original del producto para que la AI la mejore</p>
                      {aiOriginalImage ? (
                        <div className="relative inline-block">
                          <img src={aiOriginalImage} alt="Original" className="w-32 h-32 object-cover rounded-lg" />
                          <button onClick={() => { setAiOriginalImage(null); setAiOriginalImageFile(null); }} className="absolute top-1 right-1 w-6 h-6 bg-destructive rounded-full flex items-center justify-center"><X className="w-3 h-3 text-white" /></button>
                        </div>
                      ) : (
                        <button onClick={() => aiOriginalInputRef.current?.click()} className="w-32 h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors">
                          <Upload className="w-5 h-5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Galería / archivos</span>
                        </button>
                      )}
                       <input ref={aiOriginalInputRef} type="file" accept="image/*" onChange={handleAiOriginalUpload} className="hidden" />
                       {!aiOriginalImage && (
                         <Button type="button" variant="outline" onClick={handleAiClipboardPaste} className="w-full gap-2">
                           <Clipboard className="h-4 w-4" /> PEGAR DESDE PORTAPAPELES
                         </Button>
                       )}
                       <Button type="button" variant="outline" onClick={handleAiPhotoAnalyze} disabled={!aiOriginalImage || aiLoading} className="w-full gap-2 uppercase"><Sparkles className="h-4 w-4" /> DETECTAR PRODUCTOS E IMPORTAR DESDE IMAGEN</Button>
                       <p className="text-[11px] text-muted-foreground">La IA puede detectar uno o varios productos visibles, leer marcas/modelos y preparar una ficha para cada uno.</p>
                    </div>

                    <Button
                      onClick={handleAiScrape}
                      disabled={!aiUrl}
                      className={`w-full h-12 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground gap-2 text-base font-semibold ${aiLoading ? 'animate-pulse' : ''}`}
                    >
                      <Wand2 className="w-5 h-5" />
                      Extraer y Generar con AI
                    </Button>
                      </TabsContent>

                      <TabsContent value="bulk" className="space-y-4 mt-4">
                        <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-4">
                          <Label className="flex items-center gap-2 text-sm font-semibold">
                            <List className="w-4 h-4 text-primary" />
                            URLs de productos (una por línea)
                          </Label>
                          <Textarea
                            value={bulkUrls}
                            onChange={(e) => setBulkUrls(e.target.value)}
                            placeholder={"https://example.com/producto\nhttps://example.com/referencia"}
                            className="bg-background min-h-[160px] font-mono text-xs"
                            rows={6}
                          />
                          <p className="text-xs text-muted-foreground">
                            Máximo 10 URLs. Cada producto se creará automáticamente con fondo "Estudio Maker" y precio de mercado (eBay).
                          </p>
                        </div>

                        <Button
                          onClick={handleBulkImport}
                          disabled={!bulkUrls.trim() || bulkImportRunning}
                          className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground gap-2 text-base font-semibold"
                        >
                          <Wand2 className="w-5 h-5" />
                          {bulkImportRunning ? 'Importación en curso...' : 'Importar Lote con AI'}
                        </Button>
                      </TabsContent>
                    </Tabs>
                  </motion.div>
                )}

                {/* Bulk processing and results are now shown in BulkImportBanner */}

                {/* ── STEP: LOADING ── */}
                {aiStep === 'loading' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center animate-pulse">
                      <Sparkles className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-display text-lg font-semibold">Analizando y Generando...</p>
                      <p className="text-sm text-muted-foreground">Extrayendo datos de la URL y creando producto con AI</p>
                    </div>
                    <div className="w-48 h-1 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    </div>
                  </motion.div>
                )}

                {/* ── STEP: REVIEW ── */}
                {aiStep === 'review' && aiData && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    {aiPhotoMode && aiPhotoCandidates.length > 0 && (
                      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">Productos detectados en la imagen</p>
                            <p className="text-xs text-muted-foreground">Selecciona todos o solo los que quieres importar. Si seleccionas uno y generaste una imagen con IA, se guardará esa imagen optimizada; la original seguirá disponible como referencia.</p>
                          </div>
                          <span className="text-xs font-mono text-primary whitespace-nowrap">{aiPhotoCandidates.filter((candidate) => candidate.selected).length}/{aiPhotoCandidates.length}</span>
                        </div>
                        <div className="space-y-2">
                          {aiPhotoCandidates.map((candidate) => (
                            <label key={candidate.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${candidate.selected ? 'border-primary/50 bg-primary/10' : 'border-border bg-background/40'}`}>
                              <Checkbox
                                checked={candidate.selected}
                                onCheckedChange={(checked) => setAiPhotoCandidates((current) => current.map((item) => item.id === candidate.id ? { ...item, selected: checked === true } : item))}
                                className="mt-0.5"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                                  {candidate.name}
                                  {candidate.brand && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{candidate.brand}</span>}
                                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase text-muted-foreground">{candidate.confidence}</span>
                                </span>
                                <span className="mt-1 block text-xs text-muted-foreground">{candidate.description}</span>
                                <span className="mt-1 block text-[11px] text-primary">Precio sugerido: ${candidate.suggested_price.toFixed(2)} · {candidate.matched_listings_count || 0} referencias encontradas</span>
                              </span>
                            </label>
                          ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground">La ficha editable que aparece debajo muestra el primer producto como vista previa. La importación múltiple usa la información detectada de cada producto seleccionado.</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left: Image area */}
                      <div className="space-y-4">
                        <Label className="text-sm font-semibold">Imagen generada con AI</Label>

                        {/* Source image selection with delete buttons */}
                        {(aiExtractedImages.length > 0 || aiOriginalImage) && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Imagen fuente para generar con AI:</p>
                            <div className="flex gap-2 flex-wrap">
                              {aiOriginalImage && (
                                <button
                                  onClick={() => setAiSelectedSourceImage(null)}
                                  className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${!aiSelectedSourceImage ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}
                                >
                                  <img src={aiOriginalImage} alt="" className="w-full h-full object-cover" />
                                </button>
                              )}
                              {aiExtractedImages.map((img, i) => (
                                <div key={i} className="relative group">
                                  <button
                                    onClick={() => { setAiSelectedSourceImage(img); setAiOriginalImage(null); setAiPreviewImage(img); }}
                                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${aiSelectedSourceImage === img ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}
                                  >
                                    <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); removeExtractedImage(i); }}
                                    className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                  >
                                    <X className="w-2.5 h-2.5 text-white" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Generated image preview */}
                        <div className={`relative aspect-square rounded-xl overflow-hidden bg-secondary border border-border ${aiGeneratedImage && !aiImageLoading ? 'shadow-[inset_0_0_40px_rgba(212,160,23,0.1)]' : ''}`}>
                          {(aiPreviewImage || aiGeneratedImage || aiOriginalImage || aiSelectedSourceImage) ? (
                            <img src={(aiPreviewImage || aiGeneratedImage || aiOriginalImage || aiSelectedSourceImage)!} alt="Preview" className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <p className="text-sm text-muted-foreground">Sin imagen disponible</p>
                            </div>
                          )}
                          {/* Progress Log Overlay */}
                          <AnimatePresence>
                            {aiImageLoading && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 shadow-[inset_0_0_30px_rgba(212,160,23,0.15)]"
                              >
                                <AiProgressLog step={aiProgressStep} />
                                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={handleAiGenerateImage}
                            disabled={aiImageLoading || (!aiOriginalImage && !aiSelectedSourceImage)}
                            className="flex-1 gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
                          >
                            {aiImageLoading ? (
                              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                            ) : aiGeneratedImage ? (
                              <RefreshCw className="w-4 h-4" />
                            ) : (
                              <Wand2 className="w-4 h-4" />
                            )}
                            {aiGeneratedImage ? 'Regenerar Imagen' : 'Generar Imagen AI'}
                          </Button>
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => aiOriginalInputRef.current?.click()} className="text-xs gap-1">
                            <Upload className="w-3 h-3" /> Galería / archivos
                          </Button>
                          <Button variant="outline" size="sm" onClick={handleAiClipboardPaste} className="text-xs gap-1">
                            <Clipboard className="w-3 h-3" /> Pegar imagen
                          </Button>
                        </div>

                        {/* ── AI Angle Studio ── */}
                        {aiStoredImageUrl && (
                          <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-xl p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <ImagePlus className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                                <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-foreground/90">
                                  Ángulos AI
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {aiAngles.filter(a => a.url).length}/{MAX_MEDIA - 1}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(ANGLE_LABELS).map(([key, label]) => {
                                const remaining = MAX_MEDIA - 1 - aiAngles.filter(a => a.url || a.loading).length;
                                const disabled = aiAnglesGenerating || remaining <= 0;
                                return (
                                  <Button
                                    key={key}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={disabled}
                                    onClick={() => handleGenerateAngles([key])}
                                    className="h-7 text-[10px] gap-1 border-border/60 hover:border-primary/40 hover:bg-primary/5"
                                  >
                                    <Wand2 className="w-3 h-3" /> {label}
                                  </Button>
                                );
                              })}
                            </div>

                            {aiAngles.length > 0 && (
                              <div className="grid grid-cols-3 gap-1.5">
                                {aiAngles.map((a, i) => (
                                  <div key={`${a.angle}-${i}`} className="relative aspect-square rounded-lg overflow-hidden border border-border/60 bg-secondary/50 group">
                                    {a.loading ? (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                      </div>
                                    ) : a.error ? (
                                      <div className="absolute inset-0 flex items-center justify-center p-1">
                                        <AlertCircle className="w-4 h-4 text-destructive" />
                                      </div>
                                    ) : (
                                      <>
                                        <img src={a.url} alt={a.angle} className="w-full h-full object-cover" />
                                        <div className="absolute bottom-0 inset-x-0 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-white bg-gradient-to-t from-black/80 to-transparent">
                                          {ANGLE_LABELS[a.angle] || a.angle}
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => removeAiAngle(a.angle, a.url)}
                                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                          aria-label="Remove"
                                        >
                                          <X className="w-3 h-3 text-white" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                              Genera vistas extra preservando el objeto idéntico. Se añaden a la galería al guardar.
                            </p>
                          </div>
                        )}
                      </div>


                      {/* Right: Editable fields (Spanish-first) */}
                      <div className="space-y-4">
                        {/* Spanish Name */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Nombre (ES)</Label>
                            {(aiData.name_en || aiData.description_en) && (
                              <Button type="button" variant="ghost" size="sm" onClick={handleTranslateToSpanish} disabled={translating} className="h-6 gap-1 px-2 text-xs text-primary">
                                {translating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />} Español
                              </Button>
                            )}
                          </div>
                          <Input value={aiData.name_es} onChange={(e) => setAiData({ ...aiData, name_es: e.target.value })} className="bg-secondary text-sm" />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Marca / Brand</Label>
                          <Input
                            value={aiData.brand || ''}
                            onChange={(e) => setAiData({ ...aiData, brand: e.target.value })}
                            className="bg-secondary text-sm"
                            placeholder="Ej. Anker, Apple, Sony"
                            maxLength={120}
                          />
                          <p className="text-[10px] text-muted-foreground">Se detecta automáticamente cuando aparece en la fuente o imagen.</p>
                        </div>

                        {/* Spanish Description */}
                        <div className="space-y-1">
                          <Label className="text-xs">Descripción</Label>
                          <Textarea value={aiData.description_es} onChange={(e) => setAiData({ ...aiData, description_es: e.target.value })} className="bg-secondary text-sm" rows={3} />
                        </div>

                        {/* English Toggle */}
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                          <Languages className="w-4 h-4 text-primary" />
                          <Label className="text-xs flex-1">Generar versión en inglés</Label>
                          <Switch checked={showEnglish} onCheckedChange={(c) => {
                            setShowEnglish(c);
                            if (c && !aiData.name_en) handleTranslateToEnglish();
                          }} />
                        </div>

                        {showEnglish && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">Name (EN)</Label>
                                <Button variant="ghost" size="sm" onClick={handleTranslateToEnglish} disabled={translating} className="text-xs h-6 px-2 gap-1">
                                  <RefreshCw className={`w-3 h-3 ${translating ? 'animate-spin' : ''}`} /> Traducir
                                </Button>
                              </div>
                              <Input value={aiData.name_en || ''} onChange={(e) => setAiData({ ...aiData, name_en: e.target.value })} className="bg-secondary text-sm" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Description (EN)</Label>
                              <Textarea value={aiData.description_en || ''} onChange={(e) => setAiData({ ...aiData, description_en: e.target.value })} className="bg-secondary text-sm" rows={3} />
                            </div>
                          </motion.div>
                        )}

                        {/* Slug with auto-gen */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Slug</Label>
                            <button onClick={() => setSlugLocked(!slugLocked)} className="text-muted-foreground hover:text-foreground">
                              {slugLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                            </button>
                          </div>
                          <Input
                            value={aiData.slug}
                            onChange={(e) => { if (!slugLocked) setAiData({ ...aiData, slug: e.target.value }); }}
                            className="bg-secondary text-sm"
                            readOnly={slugLocked}
                          />
                          {slugLocked && <p className="text-[10px] text-muted-foreground">Se genera automáticamente del nombre {showEnglish ? '(EN)' : '(ES)'}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {/* Price */}
                          <div className="space-y-1">
                            <Label className="text-xs">Precio ($)</Label>
                            <Input type="number" step="0.01" value={aiData.suggested_price} onChange={(e) => setAiData({ ...aiData, suggested_price: parseFloat(e.target.value) || 0 })} className="bg-secondary text-sm" />
                            {aiData.price_confidence === 'high' && (
                              <p className="text-[10px] text-green-600 flex items-center gap-1">
                                🟢 Alta confianza — {aiData.matched_listings_count || 0} listings relevantes
                              </p>
                            )}
                            {aiData.price_confidence === 'medium' && (
                              <p className="text-[10px] text-yellow-600 flex items-center gap-1">
                                🟡 Confianza media — {aiData.matched_listings_count || 0} listings relevantes
                              </p>
                            )}
                            {(aiData.price_confidence === 'low' || !aiData.price_confidence) && aiData.price_source === 'ai_estimate' && (
                              <p className="text-[10px] text-muted-foreground">🔴 Estimado por IA (sin datos de mercado)</p>
                            )}
                            {(aiData.price_confidence === 'low' || !aiData.price_confidence) && aiData.price_source === 'ebay_market' && (
                              <p className="text-[10px] text-orange-500">🟠 Baja confianza — pocos resultados relevantes</p>
                            )}
                            {aiData.search_queries_used && aiData.search_queries_used.length > 0 && (
                              <details className="mt-1">
                                <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
                                  Ver queries de búsqueda ({aiData.search_queries_used.length})
                                </summary>
                                <ul className="text-[9px] text-muted-foreground mt-1 space-y-0.5 pl-2">
                                  {aiData.search_queries_used.map((q: string, i: number) => (
                                    <li key={i} className="truncate">• {q}</li>
                                  ))}
                                </ul>
                              </details>
                            )}
                          </div>
                          {/* Category with inline creation */}
                          <div className="space-y-1">
                            <Label className="text-xs">Categoría</Label>
                            <CategoryPicker
                              categories={categories}
                              value={aiData.suggested_category || ''}
                              onChange={(value) => setAiData({ ...aiData, suggested_category: value })}
                              onCreate={(name) => handleCreateCategory(name, 'ai')}
                              creating={creatingCategory}
                              valueMode="slug"
                            />
                          </div>
                        </div>

                        {/* Materials Multi-Select */}
                        <div className="space-y-2">
                          <Label className="text-xs uppercase">PRESETS DE VARIANTES</Label>
                          <p className="text-[11px] text-muted-foreground">Los colores seleccionados se convertirán en variantes editables al abrir el producto.</p>
                          <div className="flex flex-wrap gap-2 p-2 rounded-lg bg-secondary border border-border min-h-[40px]">
                            {materials.map((m) => {
                              const isSelected = (aiData.materials || []).some((mat: string) =>
                                mat.toLowerCase() === m.name_es.toLowerCase() || mat.toLowerCase() === m.name_en.toLowerCase()
                              );
                              return (
                                <label key={m.id} className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs cursor-pointer transition-colors ${isSelected ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-background border border-border hover:border-primary/30'}`}>
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                      const matName = m.name_es;
                                      if (checked) {
                                        setAiData((prev) => prev ? ({ ...prev, materials: [...(prev.materials || []), matName] }) : prev);
                                      } else {
                                        setAiData((prev) => prev ? ({ ...prev, materials: (prev.materials || []).filter((mat) => mat.toLowerCase() !== m.name_es.toLowerCase() && mat.toLowerCase() !== m.name_en.toLowerCase()) }) : prev);
                                      }
                                    }}
                                    className="w-3 h-3"
                                  />
                                  {m.name_es}
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* Colors Multi-Select */}
                        <div className="space-y-2">
                          <Label className="text-xs">Colores</Label>
                          <div className="flex flex-wrap gap-2 p-2 rounded-lg bg-secondary border border-border min-h-[40px]">
                            {COMMON_COLORS.map((color) => {
                              const isSelected = (aiData.colors || []).some((c: string) => c.toLowerCase() === color.toLowerCase());
                              return (
                                <label key={color} className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs cursor-pointer transition-colors ${isSelected ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-background border border-border hover:border-primary/30'}`}>
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setAiData((prev) => prev ? ({ ...prev, colors: [...(prev.colors || []), color] }) : prev);
                                      } else {
                                        setAiData((prev) => prev ? ({ ...prev, colors: (prev.colors || []).filter((c) => c.toLowerCase() !== color.toLowerCase()) }) : prev);
                                      }
                                    }}
                                    className="w-3 h-3"
                                  />
                                  {color}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button variant="outline" onClick={() => { setAiStep('source'); }} className="flex-1">
                        ← Volver
                      </Button>
                      <Button
                        onClick={aiPhotoMode ? handleAiImportPhotoCandidates : handleAiSaveProduct}
                        disabled={aiPhotoMode ? aiPhotoImporting || aiPhotoCandidates.every((candidate) => !candidate.selected) : false}
                        className="flex-1 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground gap-2 font-semibold"
                      >
                        {aiPhotoImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        {aiPhotoMode ? `Importar ${aiPhotoCandidates.filter((candidate) => candidate.selected).length} producto(s)` : 'Crear Producto'}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* ── ADD/EDIT PRODUCT DIALOG ── */}
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm(createEmptyProductForm()); setMediaFiles([]); setFieldErrors({}); setProductVariations([]); setEditAiImageOpen(false); setEditAiSourceImage(null); setEditAiSourceSyncing(false); setEditAiCustomBg(null); setDeleteFromEditOpen(false); setWizardStep(0); } else { if (!editId) setForm(createEmptyProductForm()); setWizardStep(0); } }}>
            <DialogTrigger asChild>
              <Button className="min-h-11 flex-1 gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground sm:flex-none"><Plus className="w-4 h-4" />Agregar Producto</Button>
            </DialogTrigger>
            <DialogContent className="flex h-[min(920px,92vh)] max-h-[92vh] w-[95vw] max-w-6xl flex-col gap-0 overflow-hidden bg-card border-border p-0">
              <DialogHeader className="sr-only"><DialogTitle>{editId ? 'Editar' : 'Agregar'} Producto</DialogTitle></DialogHeader>
              {(() => {
                const WIZARD_STEPS = [
                  { id: 0, label: 'Media', icon: ImagePlus, desc: 'Imágenes y AI' },
                  { id: 1, label: 'Identidad', icon: Languages, desc: 'Nombre y descripción' },
                  { id: 2, label: 'Precio', icon: Sparkles, desc: 'Precio y categoría' },
                  { id: 3, label: 'VARIANTS', icon: Ruler, desc: 'COLOR, SIZE, CAPACITY, STORAGE, AND MORE' },
                  { id: 4, label: 'Publicar', icon: CheckCircle2, desc: 'Revisar y guardar' },
                ];
                const liveTitle = (form.name_es || form.name_en || (editId ? 'Editar producto' : 'Nuevo producto'));
                const hasVariants = productVariations.some((variation) => !variation._deleted);
                const stepProgress = ((wizardStep + 1) / WIZARD_STEPS.length) * 100;
                const stepError = getWizardStepError(wizardStep, form);
                const completed = (step: number) => step < wizardStep && !getWizardStepError(step, form);
                const goNext = () => {
                  if (stepError) {
                    setFieldErrors({ wizard: stepError });
                    return;
                  }
                  setFieldErrors({});
                  setWizardStep(getNextWizardStep(wizardStep));
                };
                return (
              <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="flex flex-col flex-1 min-h-0">
                {/* Sticky header */}
                <div className="border-b border-border bg-card/80 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4 flex items-center justify-between gap-3 shrink-0">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{editId ? 'Editar producto' : 'Nuevo producto'}</p>
                    <h2 className="text-lg font-semibold tracking-tight truncate">{liveTitle}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} className="min-h-10 text-muted-foreground">Cancelar</Button>
                    <Button type="submit" disabled={save.isPending} size="sm" className="min-h-10 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground gap-1.5">
                      {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      {editId ? 'Guardar' : 'Publicar'}
                    </Button>
                  </div>
                </div>
                <div className="h-1 bg-border/40 shrink-0">
                  <div className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-300" style={{ width: `${stepProgress}%` }} />
                </div>

                <div className="flex flex-1 min-h-0">
                  {/* Sidebar */}
                  <aside className="hidden md:flex flex-col w-60 border-r border-border bg-background/40 p-3 shrink-0 overflow-y-auto">
                    {WIZARD_STEPS.map((s) => {
                      const Icon = s.icon;
                      const active = wizardStep === s.id;
                      const done = completed(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => (s.id <= wizardStep || completed(s.id)) && setWizardStep(s.id)}
                          className={`group flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all mb-1 ${
                            active ? 'bg-primary/10 border border-primary/30' : 'hover:bg-background/60 border border-transparent'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-semibold ${
                            done ? 'bg-primary text-primary-foreground' :
                            active ? 'bg-primary/20 text-primary border border-primary/40' :
                            'bg-secondary text-muted-foreground'
                          }`}>
                            {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium tracking-tight ${active ? 'text-primary' : 'text-foreground'}`}>{s.label}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{s.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                    <div className="mt-auto pt-4 border-t border-border/60 px-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <Switch checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: c })} />
                        <Label className="text-xs">Activo</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={form.is_featured} onCheckedChange={(c) => setForm({ ...form, is_featured: c })} />
                        <Label className="text-xs">Destacado</Label>
                      </div>
                    </div>
                  </aside>

                  {/* Mobile step pills */}
                  <div className="md:hidden absolute top-[88px] left-0 right-0 flex gap-1 overflow-x-auto px-3 pb-2 bg-card/95 backdrop-blur z-10 border-b border-border">
                    {WIZARD_STEPS.map(s => (
                      <button key={s.id} type="button" onClick={() => (s.id <= wizardStep || completed(s.id)) && setWizardStep(s.id)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 ${
                          wizardStep === s.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                        }`}>
                        {s.id + 1}. {s.label}
                      </button>
                    ))}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 md:p-8">
                    <div className="max-w-3xl mx-auto space-y-6">

                {wizardStep <= 2 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleEditEnhanceWithAi}
                  disabled={editEnhancing}
                  className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10"
                >
                  {editEnhancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {editEnhancing ? 'Generando con AI...' : '✨ Generar todo con AI'}
                </Button>
                )}
                {editEnhancing && wizardStep <= 2 && (
                  <p className="text-xs text-muted-foreground text-center">
                    La AI generará nombre, descripción, traducción, categoría y slug automáticamente
                  </p>
                )}

                {/* ── PRODUCT FORM CONTENT (all sections visible; sidebar steps are navigational anchors) ── */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight">{['Media del producto','Identidad','Precio y categoría','Variaciones','Revisar y publicar'][wizardStep]}</h3>
                    <p className="text-sm text-muted-foreground mt-1">Completa este paso y continúa cuando estés listo.</p>
                  </div>
                  {fieldErrors.wizard && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{fieldErrors.wizard}</p>}
                </div>
                {wizardStep === 0 && <div className="space-y-3">
                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight">Media del producto</h3>
                    <p className="text-sm text-muted-foreground mt-1">Sube hasta {MAX_MEDIA} imágenes o videos. La primera es la portada.</p>
                  </div>
                      <Label className="flex items-center gap-2 font-semibold uppercase">
                    <Film className="w-4 h-4 text-primary" />
                    Media ({mediaFiles.length}/{MAX_MEDIA})
                  </Label>

                  <div className="flex gap-3 flex-wrap">
                    <AnimatePresence>
                      {mediaFiles.map((item, i) => (
                        <MediaThumb
                          key={item.id}
                          item={item}
                          index={i}
                          onRemove={() => removeMedia(item.id)}
                          onDragStart={handleDragStart}
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                        />
                      ))}
                    </AnimatePresence>

                    {mediaFiles.length < MAX_MEDIA && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDropZone}
                        className="w-24 h-24 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-colors bg-secondary/30"
                      >
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground text-center leading-tight">Soltar o<br />click</span>
                      </button>
                    )}
                  </div>

                  {/* AI Image Generation Panel */}
                  {mediaFiles.length < MAX_MEDIA && (
                    <div className="space-y-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={toggleEditAiImageGenerator}
                        className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <Wand2 className="w-3 h-3" />
                        {editAiImageOpen ? 'Cerrar generador AI' : '✨ Generar imagen con AI'}
                      </Button>

                      <AnimatePresence>
                        {editAiImageOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 rounded-xl bg-secondary/50 border border-primary/20 space-y-4">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <Label className="text-xs font-semibold flex items-center gap-1">
                                    <ImagePlus className="w-3 h-3 text-primary" />
                                    Foto original del producto
                                  </Label>
                                  {mediaFiles[0]?.type !== 'video' && (
                                    <Button type="button" variant="ghost" size="sm" onClick={() => void handleUseMainImageForAi()} disabled={editAiSourceSyncing} className="h-8 gap-1.5 px-2 text-[11px] text-primary hover:bg-primary/10">
                                      {editAiSourceSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
                                      Usar portada actual
                                    </Button>
                                  )}
                                </div>
                                <p className="text-[11px] leading-5 text-muted-foreground">Al abrir este generador se carga automáticamente la primera imagen de arriba. Puedes reemplazarla si quieres usar otra referencia.</p>
                                {editAiSourceImage ? (
                                  <div className="relative inline-block">
                                    <img src={editAiSourceImage} alt="Source" className="w-24 h-24 object-cover rounded-lg" />
                                    <button type="button" onClick={() => setEditAiSourceImage(null)} className="absolute top-1 right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                                      <X className="w-3 h-3 text-white" />
                                    </button>
                                  </div>
                                ) : (
                                  <button type="button" onClick={() => editAiSourceRef.current?.click()} className="w-24 h-20 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors">
                                    <Upload className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-[10px] text-muted-foreground">Subir foto</span>
                                  </button>
                                )}
                                <input ref={editAiSourceRef} type="file" accept="image/*" onChange={handleEditAiSourceUpload} className="hidden" />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs font-semibold">Fondo</Label>
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    { value: 'system_workshop', label: 'APERFY STUDIO', badge: '★' },
                                    { value: 'system_macro', label: 'Macro', badge: null },
                                    { value: 'system_dark_premium', label: 'Dark Premium', badge: null },
                                    { value: 'custom', label: 'Custom', badge: null },
                                    { value: 'premium_tech_plinth', label: 'Tech Plinth', badge: null },
                                  ].map((opt) => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => setEditAiBgMode(opt.value)}
                                      className={`flex-1 min-w-[90px] px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${editAiBgMode === opt.value ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-background border border-border hover:border-primary/30'}`}
                                    >
                                      {opt.badge && <span className="mr-1">{opt.badge}</span>}
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {editAiBgMode === 'custom' && (
                                <div className="space-y-2">
                                  {editAiCustomBg ? (
                                    <div className="relative inline-block">
                                      <img src={editAiCustomBg} alt="BG" className="w-24 h-16 object-cover rounded-lg" />
                                      <button type="button" onClick={() => setEditAiCustomBg(null)} className="absolute top-1 right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center">
                                        <X className="w-2.5 h-2.5 text-white" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button type="button" onClick={() => editAiBgRef.current?.click()} className="w-24 h-16 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors">
                                      <Upload className="w-3 h-3 text-muted-foreground" />
                                      <span className="text-[9px] text-muted-foreground">Fondo</span>
                                    </button>
                                  )}
                                  <input ref={editAiBgRef} type="file" accept="image/*" onChange={handleEditAiBgUpload} className="hidden" />
                                </div>
                              )}

                              <Button
                                type="button"
                                onClick={handleEditAiGenerateImage}
                                disabled={!editAiSourceImage || editAiGenerating || editAiSourceSyncing}
                                className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
                              >
                                {editAiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                {editAiGenerating ? 'Generando...' : 'Generar con AI'}
                              </Button>

                              {editAiGenerating && <AiProgressLog step={editAiProgressStep} />}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT_MEDIA}
                    multiple
                    onChange={(e) => { if (e.target.files) handleMediaAdd(e.target.files); e.target.value = ''; }}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground">JPG, PNG, WebP, GIF, MP4, WebM · Imágenes max 5MB · Videos max 20MB · Arrastra para reordenar</p>
                </div>

                }
                {wizardStep === 1 && <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Marca / Brand</Label>
                    <Input
                      value={form.brand}
                      onChange={(e) => setForm({ ...form, brand: e.target.value })}
                      className="bg-secondary"
                      placeholder="Ej. Anker, Apple, Sony"
                      maxLength={120}
                    />
                    <p className="text-xs text-muted-foreground">Fabricante o marca comercial del producto. Déjalo vacío si no se conoce.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Nombre (ES)</Label>
                      {(form.name_en || form.description_en) && (
                        <Button type="button" variant="ghost" size="sm" onClick={handleEditTranslateToSpanish} disabled={editTranslating} className="h-6 gap-1 px-2 text-xs text-primary">
                          {editTranslating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />} Español
                        </Button>
                      )}
                    </div>
                    <Input value={form.name_es} onChange={(e) => setForm({ ...form, name_es: e.target.value })} className="bg-secondary" maxLength={255} required />
                    {fieldErrors.name_es && <p className="text-xs text-destructive">{fieldErrors.name_es}</p>}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Nombre (EN)</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={handleEditTranslateToEnglish} disabled={editTranslating} className="text-xs h-6 px-2 gap-1 text-primary">
                        {editTranslating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Traducir
                      </Button>
                    </div>
                    <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} className="bg-secondary" maxLength={255} required />
                    {fieldErrors.name_en && <p className="text-xs text-destructive">{fieldErrors.name_en}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Descripción (ES)</Label>
                    <Textarea value={form.description_es} onChange={(e) => setForm({ ...form, description_es: e.target.value })} className="bg-secondary" rows={3} maxLength={2000} />
                  </div>
                  <div className="space-y-2">
                    <Label>Descripción (EN)</Label>
                    <Textarea value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} className="bg-secondary" rows={3} maxLength={2000} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="bg-secondary" maxLength={255} required />
                    {fieldErrors.slug && <p className="text-xs text-destructive">{fieldErrors.slug}</p>}
                  </div>
                </div>
                </>}
                {wizardStep === 2 && <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Precio USA (USD)</Label>
                      {editId && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleEditReprice()}
                          disabled={editRepricing}
                          className="h-8 gap-1.5 border-primary/30 px-2 text-xs text-primary hover:bg-primary/10"
                        >
                          {editRepricing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                          {editRepricing ? 'Buscando…' : 'Generar Price'}
                        </Button>
                      )}
                    </div>
                    <Input type="number" step="0.01" min="0" max="999999" value={form.base_price} onFocus={(e) => e.target.select()} onChange={(e) => setForm({ ...form, base_price: parseFloat(e.target.value) || 0 })} className="bg-secondary" required />
                    {editId && <p className="text-[11px] text-muted-foreground">Actualiza el precio USA con referencias verificables y lo registra como metadato interno Precio AI.</p>}
                    {fieldErrors.base_price && <p className="text-xs text-destructive">{fieldErrors.base_price}</p>}
                  </div>
                  <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/[0.04] p-4 md:col-span-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Label className="font-semibold">🇻🇪 Precio Venezuela (USD)</Label>
                        <p className="mt-1 text-xs text-muted-foreground">El precio final se convierte a VES con la tasa configurada en Pagos → Tasas de cambio.</p>
                      </div>
                      <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                        <span>{form.venezuela_price_mode === 'global' ? 'Global' : 'Manual'}</span>
                        <Switch
                          checked={form.venezuela_price_mode === 'global'}
                          onCheckedChange={(checked) => setForm({
                            ...form,
                            venezuela_price_mode: checked ? 'global' : 'manual',
                            venezuela_price_usd: checked
                              ? calculateVenezuelaUsdPrice({ usaPrice: form.base_price, mode: 'global', manualMode: form.venezuela_manual_mode, fixedPrice: form.venezuela_price_usd, markupPercent: form.venezuela_markup_percent, globalMarkupPercent: globalVenezuelaMarkupPercent })
                              : form.venezuela_price_usd,
                          })}
                          aria-label="Usar precio global para Venezuela"
                        />
                      </label>
                    </div>

                    {form.venezuela_price_mode === 'global' ? (
                      <div className="rounded-lg border border-border/70 bg-background/60 p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span>Precio USA + {globalVenezuelaMarkupPercent}%</span>
                          <strong className="font-mono text-primary">${calculateVenezuelaUsdPrice({ usaPrice: form.base_price, mode: 'global', manualMode: form.venezuela_manual_mode, fixedPrice: form.venezuela_price_usd, markupPercent: form.venezuela_markup_percent, globalMarkupPercent: globalVenezuelaMarkupPercent }).toFixed(2)} USD</strong>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">Regla global editable en Configuración → Pagos → Tasas de cambio.</p>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
                        <div className="space-y-2">
                          <Label>Tipo manual</Label>
                          <Select value={form.venezuela_manual_mode} onValueChange={(value: VenezuelaManualMode) => setForm({ ...form, venezuela_manual_mode: value })}>
                            <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">Precio fijo</SelectItem>
                              <SelectItem value="percentage">Porcentaje</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {form.venezuela_manual_mode === 'percentage' ? (
                          <div className="space-y-2">
                            <Label>Recargo manual (%)</Label>
                            <div className="relative">
                              <Input type="number" step="0.1" min="0" max="1000" value={form.venezuela_markup_percent} onFocus={(e) => e.target.select()} onChange={(e) => setForm({ ...form, venezuela_markup_percent: parseFloat(e.target.value) || 0 })} className="bg-secondary pr-9" />
                              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">%</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Precio calculado: ${calculateVenezuelaUsdPrice({ usaPrice: form.base_price, mode: 'manual', manualMode: 'percentage', fixedPrice: form.venezuela_price_usd, markupPercent: form.venezuela_markup_percent, globalMarkupPercent: globalVenezuelaMarkupPercent }).toFixed(2)} USD.</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label>Precio fijo Venezuela (USD)</Label>
                            <Input type="number" step="0.01" min="0" max="999999" value={form.venezuela_price_usd} onFocus={(e) => e.target.select()} onChange={(e) => setForm({ ...form, venezuela_price_usd: parseFloat(e.target.value) || 0 })} className="bg-secondary" required />
                            <p className="text-xs text-muted-foreground">Este valor no cambia cuando se modifica la regla global.</p>
                          </div>
                        )}
                      </div>
                    )}
                    {fieldErrors.venezuela_price_usd && <p className="text-xs text-destructive">{fieldErrors.venezuela_price_usd}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <MarginCalculator defaultPrice={form.base_price} />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <CategoryPicker
                      categories={categories}
                      value={form.category_id}
                      onChange={(value) => setForm({ ...form, category_id: value })}
                      onCreate={(name) => handleCreateCategory(name, 'form')}
                      creating={creatingCategory}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Condición</Label>
                    <Select value={form.condition_status} onValueChange={(value: 'new' | 'used') => setForm({ ...form, condition_status: value })}>
                      <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">NEW · Nuevo</SelectItem>
                        <SelectItem value="used">USED · Usado</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Se muestra como badge en la tienda.</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: c })} /><Label>Activo</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={form.is_featured} onCheckedChange={(c) => setForm({ ...form, is_featured: c })} /><Label>Destacado</Label></div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.allows_special_notes} onCheckedChange={(c) => setForm({ ...form, allows_special_notes: c })} />
                    <Label>Permitir notas especiales</Label>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Actívalo solo para productos personalizables. Cuando está apagado, la tienda no solicitará notas o instrucciones especiales.
                </p>

                <div className="grid gap-4 rounded-xl border border-border bg-secondary/40 p-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Vendedor</Label>
                    <Input value={form.seller_name} onChange={(event) => setForm({ ...form, seller_name: event.target.value })} className="bg-secondary" maxLength={120} />
                    <p className="text-xs text-muted-foreground">Se muestra junto a la política de devolución.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Días de devolución</Label>
                    <Input type="number" min="0" max="365" value={form.return_window_days} onChange={(event) => setForm({ ...form, return_window_days: Number(event.target.value) || 0 })} className="bg-secondary" />
                  </div>
                  <div className="space-y-2">
                    <Label>Política de devolución (ES)</Label>
                    <Textarea value={form.return_policy_es} onChange={(event) => setForm({ ...form, return_policy_es: event.target.value })} className="bg-secondary" rows={3} maxLength={1000} />
                  </div>
                  <div className="space-y-2">
                    <Label>Return policy (EN)</Label>
                    <Textarea value={form.return_policy_en} onChange={(event) => setForm({ ...form, return_policy_en: event.target.value })} className="bg-secondary" rows={3} maxLength={1000} />
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-secondary/40 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label className="font-semibold">Controlar inventario</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {hasVariants
                          ? 'Este producto tiene variantes: el stock global queda desactivado y cada variante controla sus propias unidades.'
                          : 'El checkout reservará unidades y mostrará disponible, pocas unidades o agotado.'}
                      </p>
                    </div>
                    <Switch
                      checked={!hasVariants && form.inventory_enabled}
                      disabled={hasVariants}
                      onCheckedChange={(checked) => setForm({ ...form, inventory_enabled: checked })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Unidades disponibles</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={form.stock_quantity}
                        disabled={!form.inventory_enabled || hasVariants}
                        onChange={(e) => setForm({ ...form, stock_quantity: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                        className="bg-background"
                      />
                      {fieldErrors.stock_quantity && <p className="text-xs text-destructive">{fieldErrors.stock_quantity}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Umbral de pocas unidades</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={form.low_stock_threshold}
                        disabled={!form.inventory_enabled || hasVariants}
                        onChange={(e) => setForm({ ...form, low_stock_threshold: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                        className="bg-background"
                      />
                      {fieldErrors.low_stock_threshold && <p className="text-xs text-destructive">{fieldErrors.low_stock_threshold}</p>}
                    </div>
                  </div>
                </div>

                {/* ── VARIATIONS (Size/Weight) ── */}
                </>}
                {wizardStep === 3 && <>
                <div className="space-y-3 border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 font-semibold">
                      <Ruler className="w-4 h-4 text-primary" />
                      Variantes del producto
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setProductVariations(prev => [...prev, createEmptyVariation()])}

                      className="gap-1 text-xs"
                    >
                      <Plus className="w-3 h-3" /> Agregar variante
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Agrega colores, tallas, capacidades u otras opciones. Cada variante puede tener su propia foto, precio y generación de imagen con IA.
                  </p>

                  {loadingVariations && (
                    <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background/50 py-4 text-xs text-muted-foreground">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando variantes…
                    </div>
                  )}

                  {productVariations.filter(v => !v._deleted).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">Sin variantes. El producto usará solo el precio base.</p>
                  )}

                  {productVariations.filter(v => !v._deleted).map((variation, idx) => {
                    const actualIdx = productVariations.indexOf(variation);
                    const calcPrice = variation.price_override ?? 0;

                    return (
                      <div key={variation.id || `new-variation-${actualIdx}`} className="p-3 rounded-lg bg-secondary/50 border border-border space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground">Variación #{idx + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => {
                              setProductVariations(prev => {
                                const updated = [...prev];
                                if (updated[actualIdx].id && !updated[actualIdx]._isNew) {
                                  updated[actualIdx] = { ...updated[actualIdx], _deleted: true };
                                } else {
                                  updated.splice(actualIdx, 1);
                                }
                                return updated;
                              });
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Nombre (ES)</Label>
                            <Input
                              value={variation.name_es}
                              onChange={(e) => {
                                setProductVariations(prev => {
                                  const updated = [...prev];
                                  updated[actualIdx] = { ...updated[actualIdx], name_es: e.target.value };
                                  return updated;
                                });
                              }}
                              placeholder="ej. Pequeño"
                              className="bg-background text-sm h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Nombre (EN)</Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditVariationTranslate(actualIdx)}
                                disabled={variation._translating || !getVariationTranslationPayload(variation)}
                                title="Generar nombre y descripción de esta variante con IA"
                                aria-label="Generar nombre y descripción de esta variante con IA"
                                className="text-[10px] h-5 px-1.5 gap-0.5 text-primary"
                              >
                                {variation._translating ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />} AI
                              </Button>
                            </div>
                            <Input
                              value={variation.name_en}
                              onChange={(e) => {
                                setProductVariations(prev => {
                                  const updated = [...prev];
                                  updated[actualIdx] = { ...updated[actualIdx], name_en: e.target.value };
                                  return updated;
                                });
                              }}
                              placeholder="e.g. Small"
                              className="bg-background text-sm h-8"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Descripción (ES)</Label>
                            <Textarea
                              value={variation.description_es}
                              onChange={(e) => {
                                setProductVariations(prev => {
                                  const updated = [...prev];
                                  updated[actualIdx] = { ...updated[actualIdx], description_es: e.target.value };
                                  return updated;
                                });
                              }}
                              placeholder="Descripción específica de esta variante"
                              className="min-h-20 bg-background text-sm"
                              maxLength={5000}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Descripción (EN)</Label>
                            <Textarea
                              value={variation.description_en}
                              onChange={(e) => {
                                setProductVariations(prev => {
                                  const updated = [...prev];
                                  updated[actualIdx] = { ...updated[actualIdx], description_en: e.target.value };
                                  return updated;
                                });
                              }}
                              placeholder="Description specific to this variation"
                              className="min-h-20 bg-background text-sm"
                              maxLength={5000}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs flex items-center gap-1"><Weight className="w-3 h-3" /> Peso (g)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              value={variation.weight_grams}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                setProductVariations(prev => {
                                  const updated = [...prev];
                                  updated[actualIdx] = { ...updated[actualIdx], weight_grams: parseFloat(e.target.value) || 0 };
                                  return updated;
                                });
                              }}
                              placeholder="100"
                              className="bg-background text-sm h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs flex items-center gap-1"><Ruler className="w-3 h-3" /> Medidas (mm)</Label>
                            <Input
                              value={variation.dimensions}
                              onChange={(e) => {
                                setProductVariations(prev => {
                                  const updated = [...prev];
                                  updated[actualIdx] = { ...updated[actualIdx], dimensions: e.target.value };
                                  return updated;
                                });
                              }}
                              placeholder="25x25x10"
                              className="bg-background text-sm h-8"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs uppercase">Tipo de variante</Label>
                            <Select
                              value={variation.type}
                              onValueChange={(v) => {
                                setProductVariations(prev => {
                                  const updated = [...prev];
                                   updated[actualIdx] = { ...updated[actualIdx], type: v, material_id: '' };
                                  return updated;
                                });
                              }}
                            >
                              <SelectTrigger className="bg-background text-sm h-8"><SelectValue placeholder="—" /></SelectTrigger>
                              <SelectContent>
                                {['COLOR', 'SIZE', 'CAPACITY', 'STORAGE', 'FINISH', 'PACK', 'CUSTOM'].map((type) => (
                                  <SelectItem key={type} value={type.toLowerCase()}>{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Precio</Label>
                              <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground cursor-pointer select-none">
                                <Switch
                                  checked={variation.use_manual_price}
                                  onCheckedChange={(c) => {
                                    setProductVariations(prev => {
                                      const updated = [...prev];
                                      updated[actualIdx] = {
                                        ...updated[actualIdx],
                                        use_manual_price: c,
                                        price_override: c && updated[actualIdx].price_override === null ? calcPrice : updated[actualIdx].price_override,
                                        price_override_venezuela: c && updated[actualIdx].price_override_venezuela === null ? calcPrice : updated[actualIdx].price_override_venezuela,
                                      };
                                      return updated;
                                    });
                                  }}
                                  className="scale-75"
                                />
                                Manual
                              </label>
                            </div>
                            {variation.use_manual_price ? (
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div>
                                  <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">USA USD</p>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={variation.price_override ?? ''}
                                    placeholder="0.00"
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                      setProductVariations(prev => {
                                        const updated = [...prev];
                                        updated[actualIdx] = { ...updated[actualIdx], price_override: val };
                                        return updated;
                                      });
                                    }}
                                    className="bg-background text-sm h-8 font-mono text-primary"
                                  />
                                </div>
                                <div>
                                  <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Venezuela USD</p>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={variation.price_override_venezuela ?? ''}
                                    placeholder="0.00"
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                      setProductVariations(prev => {
                                        const updated = [...prev];
                                        updated[actualIdx] = { ...updated[actualIdx], price_override_venezuela: val };
                                        return updated;
                                      });
                                    }}
                                    className="bg-background text-sm h-8 font-mono text-primary"
                                  />
                                </div>
                                {calcPrice > 0 && (
                                  <p className="text-[10px] text-muted-foreground font-mono">
                                    Sugerido: ${calcPrice.toFixed(2)} (peso × material)
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="h-8 flex items-center px-3 rounded-md bg-background border border-input text-sm font-medium text-primary font-mono">
                                {calcPrice > 0 ? `$${calcPrice.toFixed(2)}` : '—'}
                                <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">auto</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Galería opcional por variación */}
                        <div className="space-y-2 rounded-lg border border-border/70 bg-background/30 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-xs flex items-center gap-1.5">
                              <Image className="w-3 h-3" /> Imágenes de variación
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{variation.images.length}/{MAX_VARIATION_MEDIA}</span>
                            </Label>
                            <span className="text-[10px] text-muted-foreground">La primera será la portada de esta variante</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {variation.images.length > 0 ? variation.images.map((image, imageIndex) => (
                              <div key={`${image}-${imageIndex}`} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-border bg-background">
                                <img src={image} alt={`${variation.name_es || variation.name_en || 'Variante'} ${imageIndex + 1}`} className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  aria-label="Eliminar imagen de variante"
                                  onClick={() => {
                                    setProductVariations(prev => {
                                      const updated = [...prev];
                                      const current = updated[actualIdx];
                                      const removed = current.images[imageIndex];
                                      if (removed.startsWith('blob:')) URL.revokeObjectURL(removed);
                                      updated[actualIdx] = {
                                        ...current,
                                        images: current.images.filter((_, idx) => idx !== imageIndex),
                                        image_url: current.images.filter((_, idx) => idx !== imageIndex)[0] || null,
                                        _imageFiles: current._imageFiles?.filter((item) => item.preview !== removed),
                                      };
                                      return updated;
                                    });
                                  }}
                                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-destructive/90 hover:bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3 text-white" />
                                </button>
                                {imageIndex === 0 && <span className="absolute bottom-0 inset-x-0 bg-primary/90 px-1 py-0.5 text-center text-[8px] font-semibold text-primary-foreground">PORTADA</span>}
                              </div>
                            )) : (
                              <div className="w-16 h-16 rounded-lg border border-dashed border-border flex items-center justify-center bg-background shrink-0">
                                <ImagePlus className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              id={`var-img-${actualIdx}`}
                              className="hidden"
                              onChange={async (e) => {
                                const files = Array.from(e.target.files || []).slice(0, Math.max(0, MAX_VARIATION_MEDIA - variation.images.length));
                                if (files.length === 0) {
                                  toast({ title: `Máximo ${MAX_VARIATION_MEDIA} imágenes por variante`, variant: 'destructive' });
                                  e.target.value = '';
                                  return;
                                }
                                const newItems: Array<{ file: File; preview: string }> = [];
                                for (const file of files) {
                                  const validation = await validateMediaFile(file);
                                  if (!validation.valid) {
                                    toast({ title: validation.error || 'Archivo inválido', variant: 'destructive' });
                                    continue;
                                  }
                                  newItems.push({ file, preview: URL.createObjectURL(file) });
                                }
                                if (newItems.length > 0) {
                                  setProductVariations(prev => {
                                    const updated = [...prev];
                                    const current = updated[actualIdx];
                                    const images = [...current.images, ...newItems.map((item) => item.preview)].slice(0, MAX_VARIATION_MEDIA);
                                    updated[actualIdx] = {
                                      ...current,
                                      images,
                                      image_url: images[0] || null,
                                      _imageFiles: [...(current._imageFiles || []), ...newItems].slice(0, MAX_VARIATION_MEDIA),
                                      _uploadingImage: false,
                                    };
                                    return updated;
                                  });
                                }
                                e.target.value = '';
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              disabled={variation._uploadingImage || variation.images.length >= MAX_VARIATION_MEDIA}
                              onClick={() => document.getElementById(`var-img-${actualIdx}`)?.click()}
                            >
                              {variation._uploadingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                              Subir imágenes
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1 text-primary"
                              disabled={variation._generatingImage || variation.images.length >= MAX_VARIATION_MEDIA || !(variation._imageFiles?.[0]?.preview || variation.images[0] || mediaFiles[0]?.preview)}
                              title={!(variation._imageFiles?.[0]?.preview || variation.images[0] || mediaFiles[0]?.preview) ? 'Sube primero una imagen principal o una foto para esta variante' : 'Cada clic agrega una nueva imagen generada a la galería'}
                              onClick={async () => {
                                setProductVariations(prev => { const u = [...prev]; u[actualIdx] = { ...u[actualIdx], _generatingImage: true }; return u; });
                                try {
                                  const base = variation._imageFiles?.[0]?.file
                                    ? await fileToBase64(variation._imageFiles[0].file)
                                    : variation.images[0] || mediaFiles[0]?.preview;
                                  if (!base) throw new Error('Necesitas una imagen principal primero.');
                                  const variantDesc = `${variation.name_es || variation.name_en || 'variation'}${variation.dimensions ? ` (${variation.dimensions}mm)` : ''}${variation.weight_grams ? `, ${variation.weight_grams}g` : ''}`;
                                  const { data, error } = await supabase.functions.invoke('ai-product-import', {
                                    body: {
                                      action: 'generate_image',
                                      sourceImage: base,
                                      backgroundMode: 'system_workshop',
                                      prompt_addition: `Same product, identical design, color and texture. Show this specific variation: ${variantDesc}. Clean studio background, premium product photography.`,
                                    },
                                  });
                                  if (error || !data?.success) throw new Error(error?.message || data?.error || 'Falló la generación');
                                  const { url: generated } = getPersistedAiImage(data.data);
                                  setProductVariations(prev => {
                                    const u = [...prev];
                                    const current = u[actualIdx];
                                    if (current.images.length < MAX_VARIATION_MEDIA) {
                                      u[actualIdx] = {
                                        ...current,
                                        images: [...current.images, generated],
                                        image_url: current.images[0] || generated,
                                        _generatingImage: false,
                                      };
                                    } else {
                                      u[actualIdx] = { ...current, _generatingImage: false };
                                    }
                                    return u;
                                  });
                                  toast({ title: '✨ Imagen agregada a la variante' });
                                } catch (err: unknown) {
                                  toast({ title: 'Error al generar', description: getErrorMessage(err), variant: 'destructive' });
                                  setProductVariations(prev => { const u = [...prev]; u[actualIdx] = { ...u[actualIdx], _generatingImage: false }; return u; });
                                }
                              }}
                            >
                              {variation._generatingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                              Generar otra con IA
                            </Button>
                          </div>
                        </div>

                        <div className="grid gap-3 rounded-lg border border-border/70 bg-background/30 p-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <Label className="text-xs font-semibold">Stock de esta variante</Label>
                              <Switch
                                checked={variation.inventory_enabled}
                                onCheckedChange={(checked) => {
                                  setProductVariations(prev => {
                                    const updated = [...prev];
                                    updated[actualIdx] = { ...updated[actualIdx], inventory_enabled: checked };
                                    return updated;
                                  });
                                }}
                              />
                            </div>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={variation.stock_quantity}
                              disabled={!variation.inventory_enabled}
                              onChange={(e) => {
                                setProductVariations(prev => {
                                  const updated = [...prev];
                                  updated[actualIdx] = { ...updated[actualIdx], stock_quantity: Math.max(0, parseInt(e.target.value, 10) || 0) };
                                  return updated;
                                });
                              }}
                              className="bg-background text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Umbral de pocas unidades</Label>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={variation.low_stock_threshold}
                              disabled={!variation.inventory_enabled}
                              onChange={(e) => {
                                setProductVariations(prev => {
                                  const updated = [...prev];
                                  updated[actualIdx] = { ...updated[actualIdx], low_stock_threshold: Math.max(0, parseInt(e.target.value, 10) || 0) };
                                  return updated;
                                });
                              }}
                              className="bg-background text-sm"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={variation.is_active}
                            onCheckedChange={(c) => {
                              setProductVariations(prev => {
                                const updated = [...prev];
                                updated[actualIdx] = { ...updated[actualIdx], is_active: c };
                                return updated;
                              });
                            }}
                          />
                          <Label className="text-xs">Activa</Label>
                        </div>
                      </div>
                    );
                  })}
                </div>

                </>}
                {wizardStep === 4 && <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-primary">Último paso</p>
                    <h4 className="text-xl font-semibold mt-1">Revisa y publica</h4>
                    <p className="text-sm text-muted-foreground mt-1">Confirma que la ficha está lista antes de guardarla.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    <div className="rounded-lg bg-background/60 p-3"><span className="text-muted-foreground">Nombre</span><p className="font-medium truncate">{form.name_es || 'Sin nombre'}</p></div>
                    <div className="rounded-lg bg-background/60 p-3"><span className="text-muted-foreground">Precio base</span><p className="font-medium">${Number(form.base_price || 0).toFixed(2)}</p></div>
                    <div className="rounded-lg bg-background/60 p-3"><span className="text-muted-foreground">Media</span><p className="font-medium">{mediaFiles.length} archivo(s)</p></div>
                    <div className="rounded-lg bg-background/60 p-3"><span className="text-muted-foreground">Variantes</span><p className="font-medium">{productVariations.filter(v => !v._deleted).length}</p></div>
                  </div>
                </div>}

                {editId && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/[0.06] p-3 lg:hidden">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-destructive">Zona de peligro</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">Eliminar este producto de forma permanente.</p>
                    </div>
                    <Button type="button" variant="ghost" onClick={() => setDeleteFromEditOpen(true)} className="min-h-11 shrink-0 gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" /> Eliminar
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-6 border-t border-border/40 mt-6">
                  <Button type="button" variant="ghost" onClick={() => setWizardStep(getPreviousWizardStep(wizardStep))} disabled={wizardStep === 0}>
                    ← Anterior
                  </Button>
                  {wizardStep < 4 ? (
                    <Button type="button" onClick={goNext} className="bg-foreground text-background hover:bg-foreground/90">
                      Siguiente →
                    </Button>
                  ) : (
                    <Button type="submit" disabled={save.isPending} className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground gap-1.5">
                      {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      {editId ? 'Guardar cambios' : 'Publicar producto'}
                    </Button>
                  )}
                </div>
                    </div>
                  </div>
                </div>
              </form>
                );
              })()}
            </DialogContent>
          </Dialog>
        </div>
        }
      />

      <AnimatePresence>
        {selectedProductIds.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -8, height: 0 }} className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/[0.08] px-4 py-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-destructive/15 px-2 font-semibold text-destructive">{selectedProductIds.length}</span>
              <span>producto(s) seleccionado(s)</span>
              <Button variant="ghost" size="sm" onClick={() => setSelectedProductIds([])} className="h-8 text-muted-foreground hover:text-foreground">Limpiar selección</Button>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)} className="gap-1.5"><Trash2 className="h-4 w-4" /> Eliminar seleccionados</Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bulkAiJob && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mb-4 rounded-xl border border-primary/25 bg-primary/[0.06] px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium">{bulkAiJob.kind === 'images' ? 'Regenerando imágenes' : 'Haciendo Reprice USA'} · {bulkAiJob.completed}/{bulkAiJob.total}</span>
              <span className="font-mono text-xs text-muted-foreground">{bulkAiJob.succeeded} OK · {bulkAiJob.skipped} omitidos · {bulkAiJob.failed} errores</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
              <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${bulkAiJob.total ? (bulkAiJob.completed / bulkAiJob.total) * 100 : 0}%` }} />
            </div>
            {bulkAiJob.currentName && <p className="mt-2 truncate text-xs text-muted-foreground">Procesando: {bulkAiJob.currentName}</p>}
            {bulkAiJob.errors.length > 0 && <p className="mt-1 truncate text-xs text-destructive">Último error: {bulkAiJob.errors[bulkAiJob.errors.length - 1]}</p>}
            {bulkAiJob.kind === 'reprice' && bulkAiJob.repriceResults.length > 0 && (() => {
              const result = bulkAiJob.repriceResults[bulkAiJob.repriceResults.length - 1];
              return (
                <div className="mt-3 rounded-lg border border-border/60 bg-background/40 p-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{result.name}</span>
                    {result.updated && result.suggestedPrice !== undefined ? (
                      <span className="font-mono text-primary">${Number(result.previousPrice || 0).toFixed(2)} → ${result.suggestedPrice.toFixed(2)}</span>
                    ) : <span className="text-muted-foreground">Sin cambio</span>}
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {result.updated ? `Precio basado en ${result.references.length} referencia(s)${result.confidence ? ` · confianza ${result.confidence}` : ''}.` : (result.message || 'No hubo evidencia suficiente para cambiar el precio.')}
                  </p>
                  {result.references.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {result.references.slice(0, 6).map((reference, index) => (
                        reference.url ? (
                          <a key={`${reference.url}-${index}`} href={reference.url} target="_blank" rel="noreferrer" className="rounded-md border border-border/70 px-2 py-1 text-muted-foreground hover:border-primary/50 hover:text-primary">
                            {reference.source} ${reference.price.toFixed(2)}
                          </a>
                        ) : <span key={`${reference.source}-${index}`} className="rounded-md border border-border/70 px-2 py-1 text-muted-foreground">{reference.source} ${reference.price.toFixed(2)}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar productos seleccionados?</AlertDialogTitle>
            <AlertDialogDescription>Vas a eliminar {selectedProductIds.length} producto(s). Esta acción no se puede deshacer y también retirará sus ofertas de la tienda.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); void handleBulkDelete(); }} disabled={bulkDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {bulkDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {bulkDeleting ? 'Eliminando...' : 'Eliminar productos'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteFromEditOpen} onOpenChange={setDeleteFromEditOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este producto?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. Si el producto tiene historial de pedidos, se archivará en lugar de eliminarse.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); handleDeleteFromEdit(); }} disabled={del.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {del.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {del.isPending ? 'Eliminando...' : 'Eliminar producto'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mb-4 rounded-2xl border border-border/70 bg-card/50 p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 text-sm">
            <span className="flex min-h-11 items-center gap-2 rounded-lg border border-border/70 bg-background/30 px-2.5">
              <Checkbox checked={allProductsSelected} onCheckedChange={(checked) => setSelectedProductIds(toggleAllBulkSelection(selectedProductIds, visibleProductIds, checked === true))} aria-label={allProductsSelected ? 'Deseleccionar todos' : 'Seleccionar todos'} />
              <span className="hidden text-xs text-muted-foreground sm:inline">Seleccionar todos</span>
            </span>
            {bulkEditMode && bulkEditCount > 0 && <span className="text-xs text-muted-foreground">{bulkEditCount} modificados</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-h-11 flex-1 items-center rounded-lg border border-border/70 bg-background/30 p-1 sm:flex-none">
              <Button type="button" variant={productViewMode === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => handleProductViewChange('list')} aria-pressed={productViewMode === 'list'} className="min-h-9 flex-1 gap-2 sm:flex-none">
                <List className="h-4 w-4" /> <span>Lista</span>
              </Button>
              <Button type="button" variant={productViewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" onClick={() => handleProductViewChange('grid')} aria-pressed={productViewMode === 'grid'} className="min-h-9 flex-1 gap-2 sm:flex-none">
                <LayoutGrid className="h-4 w-4" /> <span>Grid</span>
              </Button>
            </div>
            {bulkEditMode ? (
              <>
                <Button variant="outline" size="sm" onClick={() => { setBulkEditMode(false); setBulkEdits({}); }} className="min-h-11 gap-1">
                  <XCircle className="h-4 w-4" /> Cancelar
                </Button>
                <Button size="sm" onClick={handleBulkSave} disabled={bulkSaving || bulkEditCount === 0} className="min-h-11 gap-1 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                  <Save className="h-4 w-4" /> {bulkSaving ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setBulkEditMode(true)} className="min-h-11 gap-1">
                <Pencil className="h-4 w-4" /> Editar en lote
              </Button>
            )}
          </div>
        </div>
      </div>

      <ProductCatalogViews
        products={products as AdminProduct[]}
        categories={categories as Pick<{ id: string; name_es: string }, 'id' | 'name_es'>[]}
        viewMode={productViewMode}
        bulkEditMode={bulkEditMode}
        bulkEdits={bulkEdits}
        selectedProductIds={selectedProductIds}
        allProductsSelected={allProductsSelected}
        onToggleAll={(checked) => setSelectedProductIds(toggleAllBulkSelection(selectedProductIds, visibleProductIds, checked))}
        onToggleSelected={(productId, checked) => setSelectedProductIds(toggleBulkSelection(selectedProductIds, productId, checked))}
        getBulkValue={getBulkValue}
        onBulkFieldChange={setBulkField}
        onToggle={(id, field, value) => quickToggle.mutate({ id, field, value })}
        onEdit={openEdit}
        onDelete={(id) => del.mutate(id)}
      />
    </div>
  );
}
