import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useBulkImport } from '@/contexts/BulkImportContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Image, Sparkles, Link2, Upload, X, GripVertical, Film, RefreshCw, Wand2, ImagePlus, Lock, Unlock, Languages, List, CheckCircle2, AlertCircle, Loader2, Save, XCircle, Weight, Ruler } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { productSchema, validateMediaFile, sanitizeFileName } from '@/lib/validation';
import { sanitizeUrl } from '@/lib/sanitize';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ──
interface ProductForm {
  name_en: string;
  name_es: string;
  description_en: string;
  description_es: string;
  slug: string;
  base_price: number;
  category_id: string;
  is_active: boolean;
  is_featured: boolean;
}

interface MediaItem {
  id: string;
  file?: File;
  preview: string;
  type: 'image' | 'gif' | 'video';
  isExisting?: boolean;
}

const empty: ProductForm = {
  name_en: '', name_es: '', description_en: '', description_es: '',
  slug: '', base_price: 0, category_id: '', is_active: true, is_featured: false,
};

const MAX_MEDIA = 5;
const ACCEPT_MEDIA = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm';

const COMMON_COLORS = [
  'Negro', 'Blanco', 'Gris', 'Rojo', 'Azul', 'Verde', 'Amarillo',
  'Naranja', 'Morado', 'Rosa', 'Dorado', 'Plateado', 'Marrón', 'Transparente'
];

// ── AI Progress Log ──
const AI_PROGRESS_MESSAGES = [
  '◉ Aislando modelo 3D...',
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
      onDragStart={(e: any) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e: any) => onDrop(e, index)}
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
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
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

// ══════════════════════════════════════════════════════════════
// ── MAIN COMPONENT ──
// ══════════════════════════════════════════════════════════════
export default function AdminProducts() {
  const [open, setOpen] = useState(false);
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
  const [aiData, setAiData] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiImageLoading, setAiImageLoading] = useState(false);
  const [aiProgressStep, setAiProgressStep] = useState(0);
  const [aiExtractedImages, setAiExtractedImages] = useState<string[]>([]);
  const [aiSelectedSourceImage, setAiSelectedSourceImage] = useState<string | null>(null);
  const [aiBgMode, setAiBgMode] = useState<'system' | 'ai' | 'custom'>('system');
  const [showEnglish, setShowEnglish] = useState(false);
  const [slugLocked, setSlugLocked] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [translating, setTranslating] = useState(false);
  const aiOriginalInputRef = useRef<HTMLInputElement>(null);
  const aiBgInputRef = useRef<HTMLInputElement>(null);

  // Variations state for product modal
  interface VariationRow {
    id?: string;
    name_en: string;
    name_es: string;
    type: string;
    weight_grams: number;
    material_id: string;
    dimensions: string;
    is_active: boolean;
    _isNew?: boolean;
    _deleted?: boolean;
  }
  const [productVariations, setProductVariations] = useState<VariationRow[]>([]);
  const [loadingVariations, setLoadingVariations] = useState(false);

  // Edit dialog AI state
  const [editAiImageOpen, setEditAiImageOpen] = useState(false);
  const [editAiSourceImage, setEditAiSourceImage] = useState<string | null>(null);
  const [editAiBgMode, setEditAiBgMode] = useState<'system' | 'ai' | 'custom'>('system');
  const [editAiCustomBg, setEditAiCustomBg] = useState<string | null>(null);
  const [editAiGenerating, setEditAiGenerating] = useState(false);
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
  const [bulkEdits, setBulkEdits] = useState<Record<string, { name_es?: string; base_price?: number; category_id?: string | null; is_active?: boolean }>>({});
  const [bulkSaving, setBulkSaving] = useState(false);

  const bulkEditCount = Object.keys(bulkEdits).length;

  const getBulkValue = (productId: string, field: string, original: any) => {
    const edits = bulkEdits[productId];
    if (edits && field in edits) return (edits as any)[field];
    return original;
  };

  const setBulkField = (productId: string, field: string, value: any, original: any) => {
    setBulkEdits(prev => {
      const current = { ...prev };
      if (!current[productId]) current[productId] = {};
      (current[productId] as any)[field] = value;
      if (value === original) {
        delete (current[productId] as any)[field];
        if (Object.keys(current[productId]).length === 0) delete current[productId];
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
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
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
  const { language } = useLanguage();

  const { data: products = [] } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*, categories(name_en, name_es)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').eq('is_active', true).order('name_en');
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

  // Auto-slug from name (English if showEnglish is active, otherwise Spanish)
  useEffect(() => {
    if (aiData && slugLocked) {
      const source = showEnglish && aiData.name_en ? aiData.name_en : (aiData.name_es || '');
      setAiData((prev: any) => prev ? { ...prev, slug: slugify(source) } : prev);
    }
  }, [aiData?.name_es, aiData?.name_en, showEnglish, slugLocked]);

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

      const payload = { ...f, category_id: f.category_id || null, base_price: Number(f.base_price) };
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
        await supabase.from('products').update({ images: imageUrls }).eq('id', productId);
      }
      // Save variations
      if (productId && productVariations.length > 0) {
        // Delete removed variations
        const existingIds = productVariations.filter(v => v.id && !v._deleted).map(v => v.id!);
        if (editId) {
          // Delete variations not in current list
          const { data: currentVars } = await supabase.from('product_variations').select('id').eq('product_id', productId);
          const toDelete = (currentVars || []).filter(cv => !existingIds.includes(cv.id));
          for (const d of toDelete) {
            await supabase.from('product_variations').delete().eq('id', d.id);
          }
        }
        // Upsert variations
        for (const v of productVariations.filter(vr => !vr._deleted)) {
          // Find selected material for this product to calc price
          const selectedMaterial = materials.find((m: any) => m.id === v.material_id);
          const costPerKg = selectedMaterial ? Number(selectedMaterial.cost_per_kg || 0) : 0;
          const calculatedPrice = v.weight_grams > 0 && costPerKg > 0
            ? (v.weight_grams / 1000) * costPerKg
            : 0;
          
          const varPayload = {
            product_id: productId,
            name_en: v.name_en,
            name_es: v.name_es,
            type: v.type || 'size',
            weight_grams: v.weight_grams || null,
            dimensions: v.dimensions || null,
            material_id: v.material_id || null,
            price_modifier: calculatedPrice,
            value: `${v.weight_grams}g`,
            is_active: v.is_active,
          };
          
          if (v.id && !v._isNew) {
            await supabase.from('product_variations').update(varPayload).eq('id', v.id);
          } else {
            await supabase.from('product_variations').insert(varPayload);
          }
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['admin-product-count'] });
      setOpen(false);
      setEditId(null);
      setForm(empty);
      setMediaFiles([]);
      setProductVariations([]);
      toast({ title: '✓', description: 'Producto guardado.' });
    },
    onError: (e: any) => {
      if (e.message !== 'Validation failed') {
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
      }
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['admin-product-count'] });
      toast({ title: '✓', description: 'Producto eliminado.' });
    },
  });

  const openEdit = (p: any) => {
    setEditId(p.id);
    setFieldErrors({});
    setForm({
      name_en: p.name_en, name_es: p.name_es,
      description_en: p.description_en || '', description_es: p.description_es || '',
      slug: p.slug, base_price: p.base_price,
      category_id: p.category_id || '', is_active: p.is_active, is_featured: p.is_featured,
    });
    const existingImages = (p.images as string[]) || [];
    setMediaFiles(existingImages.map((url, i) => ({
      id: `existing-${i}`,
      preview: url,
      type: getMediaTypeFromUrl(url),
      isExisting: true,
    })));
    // Load existing variations
    setLoadingVariations(true);
    supabase.from('product_variations').select('*').eq('product_id', p.id).order('created_at').then(({ data }) => {
      setProductVariations((data || []).map((v: any) => ({
        id: v.id,
        name_en: v.name_en,
        name_es: v.name_es,
        type: v.type,
        weight_grams: v.weight_grams || 0,
        material_id: v.material_id || '',
        dimensions: v.dimensions || '',
        is_active: v.is_active,
      })));
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
    setAiExtractedImages([]);
    setAiSelectedSourceImage(null);
    setAiBgMode('system');
    setShowEnglish(false);
    setSlugLocked(true);
    setNewCategoryName('');
    setCreatingCategory(false);
    setBulkMode(false);
    setBulkUrls('');
  };

  // Helper: persist an AI image (data URI or remote URL) to storage immediately
  const persistAiImage = async (imageSource: string): Promise<{ url: string; path: string }> => {
    let blob: Blob;
    if (imageSource.startsWith('data:')) {
      const [header, b64] = imageSource.split(',');
      const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
      const byteString = atob(b64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      blob = new Blob([ia], { type: mime });
    } else {
      const resp = await fetch(imageSource);
      if (!resp.ok) throw new Error('Failed to download AI image');
      blob = await resp.blob();
    }
    const fileName = `ai-import-temp/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
    const { error } = await supabase.storage.from('product-images').upload(fileName, blob, { contentType: blob.type || 'image/png', upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return { url: data.publicUrl, path: fileName };
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const triggerAiGenerateImage = async (sourceImg: string) => {
    let customBackground: string | undefined;
    if (aiBgMode === 'system' && systemBgSetting) {
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
      if (error) {
        const errorMsg = data?.error || error.message || 'Error al generar imagen';
        throw new Error(errorMsg);
      }
      if (!data?.success) throw new Error(data?.error || 'Error al generar imagen');
      
      const generatedImg = data.data.generated_image;
      setAiGeneratedImage(generatedImg);
      setAiPreviewImage(generatedImg);

      // Persist to storage immediately
      try {
        const { url, path } = await persistAiImage(generatedImg);
        setAiStoredImageUrl(url);
        setAiStoredImagePath(path);
      } catch (persistErr: any) {
        console.error('Failed to persist AI image:', persistErr);
        toast({ title: 'Error guardando imagen', description: 'La imagen se generó pero no se pudo guardar. Intenta regenerar.', variant: 'destructive' });
        setAiGeneratedImage(null);
        setAiPreviewImage(null);
        return;
      }

      toast({ title: '✓', description: '¡Imagen AI generada!' });
    } catch (e: any) {
      toast({ title: 'Error generando imagen', description: e.message, variant: 'destructive' });
    } finally {
      setAiImageLoading(false);
      setAiPersistingImage(false);
    }
  };

  const handleAiScrape = async () => {
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
          url: aiUrl,
          existingCategories: categories.map((c: any) => ({ slug: c.slug, name_en: c.name_en, name_es: c.name_es })),
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Error al extraer datos');

      setAiData(data.data);
      setAiExtractedImages(data.data.extracted_images || []);

      // Determine best source image: manual upload > AI reference > first extracted
      const bestImage = aiOriginalImage || data.data.reference_image_url || data.data.extracted_images?.[0] || null;
      if (!aiOriginalImage) {
        setAiSelectedSourceImage(bestImage);
      }
      setAiStep('review');

      // Auto-trigger image generation with the resolved source image directly
      if (bestImage) {
        triggerAiGenerateImage(bestImage);
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      setAiStep('source');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiGenerateImage = async () => {
    const sourceImage = aiOriginalImage || aiSelectedSourceImage;
    if (!sourceImage) {
      toast({ title: 'No hay imagen fuente disponible', variant: 'destructive' });
      return;
    }
    await triggerAiGenerateImage(sourceImage);
  };

  const handleAiOriginalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    setAiOriginalImage(b64);
    setAiOriginalImageFile(file);
    setAiSelectedSourceImage(null);
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
        body: { action: 'translate', name_es: aiData.name_es, description_es: aiData.description_es },
      });
      if (error) throw error;
      if (data?.success) {
        const newNameEn = data.data.name_en;
        setAiData((prev: any) => {
          const updated = { ...prev, name_en: newNameEn, description_en: data.data.description_en };
          // Regenerate slug from English name if English mode is on and slug is locked
          if (showEnglish && slugLocked && newNameEn) {
            updated.slug = slugify(newNameEn);
          }
          return updated;
        });
        toast({ title: '✓', description: 'Traducción generada' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
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
  };

  const handleEditAiBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    setEditAiCustomBg(b64);
  };

  const handleEditAiGenerateImage = async () => {
    if (!editAiSourceImage) {
      toast({ title: 'Sube una foto del producto primero', variant: 'destructive' });
      return;
    }

    let customBackground: string | undefined;
    if (editAiBgMode === 'system' && systemBgSetting) {
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
      if (error) throw new Error(data?.error || error.message || 'Error');
      if (!data?.success) throw new Error(data?.error || 'Error al generar imagen');

      const generatedImg = data.data.generated_image;
      // Persist to storage
      const { url } = await persistAiImage(generatedImg);
      
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
    } catch (e: any) {
      toast({ title: 'Error generando imagen', description: e.message, variant: 'destructive' });
    } finally {
      setEditAiGenerating(false);
    }
  };

  const handleEditEnhanceWithAi = async () => {
    setEditEnhancing(true);
    try {
      // Get first image URL for context
      const firstImage = mediaFiles[0]?.preview || null;
      
      const { data, error } = await supabase.functions.invoke('ai-product-import', {
        body: {
          action: 'enhance_product',
          name_es: form.name_es,
          description_es: form.description_es,
          existingCategories: categories.map((c: any) => ({ slug: c.slug, name_en: c.name_en, name_es: c.name_es })),
          imageUrl: firstImage,
        },
      });
      if (error) throw new Error(data?.error || error.message);
      if (!data?.success) throw new Error(data?.error || 'Error');

      const enhanced = data.data;
      const matchedCat = categories.find((c: any) => c.slug === enhanced.suggested_category);

      setForm(prev => ({
        ...prev,
        name_es: enhanced.name_es || prev.name_es,
        name_en: enhanced.name_en || prev.name_en,
        description_es: enhanced.description_es || prev.description_es,
        description_en: enhanced.description_en || prev.description_en,
        slug: enhanced.slug || prev.slug,
        category_id: matchedCat?.id || prev.category_id,
      }));
      toast({ title: '✓', description: 'Producto mejorado con AI' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setEditEnhancing(false);
    }
  };

  const handleEditTranslateToEnglish = async () => {
    if (!form.name_es && !form.description_es) return;
    setEditTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-product-import', {
        body: { action: 'translate', name_es: form.name_es, description_es: form.description_es },
      });
      if (error) throw error;
      if (data?.success) {
        setForm(prev => ({
          ...prev,
          name_en: data.data.name_en,
          description_en: data.data.description_en,
          slug: slugify(data.data.name_en),
        }));
        toast({ title: '✓', description: 'Traducción generada' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setEditTranslating(false);
    }
  };

  const handleEditVariationTranslate = async (idx: number) => {
    const variation = productVariations[idx];
    if (!variation.name_es) return;
    try {
      const { data, error } = await supabase.functions.invoke('ai-product-import', {
        body: { action: 'translate', name_es: variation.name_es, description_es: '' },
      });
      if (error) throw error;
      if (data?.success) {
        setProductVariations(prev => {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], name_en: data.data.name_en };
          return updated;
        });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      const catSlug = slugify(newCategoryName);
      const { data, error } = await supabase.from('categories').insert({
        name_es: newCategoryName.trim(),
        name_en: newCategoryName.trim(),
        slug: catSlug,
        is_active: true,
      }).select().single();
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      setAiData((prev: any) => ({ ...prev, suggested_category: data.slug }));
      setNewCategoryName('');
      toast({ title: '✓', description: 'Categoría creada' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
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
    const matchedCat = categories.find((c: any) => c.slug === aiData.suggested_category);

    const nameEn = aiData.name_en || aiData.name_es;
    const descEn = aiData.description_en || aiData.description_es;

    setForm({
      name_en: nameEn,
      name_es: aiData.name_es || '',
      description_en: descEn,
      description_es: aiData.description_es || '',
      slug: aiData.slug || slugify(aiData.name_es || ''),
      base_price: aiData.suggested_price || 0,
      category_id: matchedCat?.id || '',
      is_active: true,
      is_featured: false,
    });

    // Use the already-persisted storage URL instead of fetching the temporary one
    if (aiStoredImageUrl) {
      setMediaFiles([{
        id: `ai-${Date.now()}`,
        preview: aiStoredImageUrl,
        type: 'image',
        isExisting: true,
      }]);
    } else {
      setMediaFiles([]);
    }

    setAiOpen(false);
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

  // ── BULK IMPORT ──
  const handleBulkImport = async () => {
    const urls = bulkUrls.split('\n').map(u => u.trim()).filter(u => u && isValidUrl(u));
    if (urls.length === 0) {
      toast({ title: 'Ingresa al menos una URL válida', variant: 'destructive' });
      return;
    }
    if (urls.length > 10) {
      toast({ title: 'Máximo 10 URLs permitidas', variant: 'destructive' });
      return;
    }

    setBulkProcessing(true);
    setBulkResults(urls.map(url => ({ url, status: 'queued' as BulkItemStatus })));

    let created = 0;
    let errors = 0;

    for (let i = 0; i < urls.length; i++) {
      const currentUrl = urls[i];
      try {
        // Step 1: Scrape
        setBulkResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'scraping' } : r));
        const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke('ai-product-import', {
          body: {
            action: 'scrape',
            url: currentUrl,
            existingCategories: categories.map((c: any) => ({ slug: c.slug, name_en: c.name_en, name_es: c.name_es })),
          },
        });
        if (scrapeError || !scrapeData?.success) throw new Error(scrapeData?.error || 'Scrape failed');
        const productInfo = scrapeData.data;

        setBulkResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'generating', name: productInfo.name_es } : r));

        // Step 2: Generate image and persist immediately
        let persistedImageUrl: string | null = null;
        const bestSourceImage = productInfo.reference_image_url || productInfo.extracted_images?.[0];
        if (bestSourceImage) {
          try {
            const { data: imgData } = await supabase.functions.invoke('ai-product-import', {
              body: {
                action: 'generate_image',
                sourceImage: bestSourceImage,
                backgroundMode: 'system',
                customBackground: systemBgSetting || undefined,
              },
            });
            if (imgData?.success && imgData.data.generated_image) {
              const { url } = await persistAiImage(imgData.data.generated_image);
              persistedImageUrl = url;
            }
          } catch {
            // Image generation/persist failed, continue without image
          }
        }

        // Step 3: Save product with persisted image
        setBulkResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'saving' } : r));
        const matchedCat = categories.find((c: any) => c.slug === productInfo.suggested_category);
        const nameEn = productInfo.name_en || productInfo.name_es;
        const descEn = productInfo.description_en || productInfo.description_es;
        const productSlug = productInfo.slug || slugify(productInfo.name_es || `product-${Date.now()}`);

        const { error: insertError } = await supabase.from('products').insert({
          name_en: nameEn,
          name_es: productInfo.name_es || '',
          description_en: descEn,
          description_es: productInfo.description_es || '',
          slug: productSlug,
          base_price: productInfo.suggested_price || 0,
          category_id: matchedCat?.id || null,
          is_active: true,
          is_featured: false,
          images: persistedImageUrl ? [persistedImageUrl] : [],
        });
        if (insertError) throw insertError;

        setBulkResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'done' } : r));
        created++;
      } catch (e: any) {
        setBulkResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'error', error: e.message } : r));
        errors++;
      }
    }

    setBulkProcessing(false);
    qc.invalidateQueries({ queryKey: ['admin-products'] });
    qc.invalidateQueries({ queryKey: ['admin-product-count'] });
    toast({
      title: `Importación completada`,
      description: `${created} productos creados, ${errors} errores`,
    });
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Productos</h1>
        <div className="flex gap-2">
          {/* AI Import Studio Button */}
          <Dialog open={aiOpen} onOpenChange={(o) => { setAiOpen(o); if (!o) resetAi(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
                <Sparkles className="w-4 h-4" />
                AI Import Studio
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-4xl max-h-[90vh] overflow-y-auto p-0">
              <div className="p-6 pb-0">
                <DialogHeader>
                  <DialogTitle className="font-display flex items-center gap-2 text-xl">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-primary-foreground" />
                    </div>
                    AI Import Studio
                  </DialogTitle>
                </DialogHeader>
              </div>

              <div className="p-6 pt-4">
                {/* ── STEP: SOURCE ── */}
                {aiStep === 'source' && !bulkProcessing && (
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
                          placeholder="https://www.thingiverse.com/thing/..."
                          className="bg-background"
                          maxLength={2000}
                        />
                        <p className="text-xs text-muted-foreground">Pega un enlace a un modelo 3D de Thingiverse, MyMiniFactory, Cults3D, etc.</p>
                      </div>
                    </div>

                    {/* Background Mode Selector — Card Style */}
                    <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-4">
                      <Label className="flex items-center gap-2 text-sm font-semibold">
                        <Image className="w-4 h-4 text-primary" />
                        Fondo para imagen AI
                      </Label>
                      <RadioGroup value={aiBgMode} onValueChange={(v) => setAiBgMode(v as 'system' | 'ai' | 'custom')} className="space-y-3">
                        {/* Estudio Maker */}
                        <div
                          onClick={() => setAiBgMode('system')}
                          className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:border-primary/50 ${aiBgMode === 'system' ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(212,160,23,0.1)]' : 'border-border bg-background'}`}
                        >
                          <RadioGroupItem value="system" id="bg-system" className="sr-only" />
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${aiBgMode === 'system' ? 'border-primary' : 'border-muted-foreground'}`}>
                              {aiBgMode === 'system' && <div className="w-2 h-2 rounded-full bg-primary" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">Estudio Maker</span>
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary">Recomendado</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">Fondo hiperrealista de taller con impresora 3D y desenfoque cinematográfico</p>
                            </div>
                          </div>
                        </div>

                        {/* Exhibición Tech */}
                        <div
                          onClick={() => setAiBgMode('ai')}
                          className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:border-primary/50 ${aiBgMode === 'ai' ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(212,160,23,0.1)]' : 'border-border bg-background'}`}
                        >
                          <RadioGroupItem value="ai" id="bg-ai" className="sr-only" />
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${aiBgMode === 'ai' ? 'border-primary' : 'border-muted-foreground'}`}>
                              {aiBgMode === 'ai' && <div className="w-2 h-2 rounded-full bg-primary" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-sm">Exhibición Tech Abstracta</span>
                              <p className="text-xs text-muted-foreground mt-1">Estilo geométrico oscuro con nodos de red y marca 3DtoPrint grabada</p>
                            </div>
                          </div>
                        </div>

                        {/* Fondo Personalizado */}
                        <div
                          onClick={() => setAiBgMode('custom')}
                          className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:border-primary/50 ${aiBgMode === 'custom' ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(212,160,23,0.1)]' : 'border-border bg-background'}`}
                        >
                          <RadioGroupItem value="custom" id="bg-custom" className="sr-only" />
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${aiBgMode === 'custom' ? 'border-primary' : 'border-muted-foreground'}`}>
                              {aiBgMode === 'custom' && <div className="w-2 h-2 rounded-full bg-primary" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-sm">Fondo Personalizado</span>
                              <p className="text-xs text-muted-foreground mt-1">Sube tu propia imagen de fondo</p>
                            </div>
                          </div>
                        </div>
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
                      <Label className="flex items-center gap-2 text-sm font-semibold">
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
                          <span className="text-xs text-muted-foreground">Subir</span>
                        </button>
                      )}
                      <input ref={aiOriginalInputRef} type="file" accept="image/*" onChange={handleAiOriginalUpload} className="hidden" />
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
                            placeholder={"https://www.thingiverse.com/thing/12345\nhttps://www.thingiverse.com/thing/67890\nhttps://cults3d.com/en/3d-model/..."}
                            className="bg-background min-h-[160px] font-mono text-xs"
                            rows={6}
                          />
                          <p className="text-xs text-muted-foreground">
                            Máximo 10 URLs. Cada producto se creará automáticamente con fondo "Estudio Maker" y precio de mercado (eBay).
                          </p>
                        </div>

                        <Button
                          onClick={handleBulkImport}
                          disabled={!bulkUrls.trim()}
                          className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground gap-2 text-base font-semibold"
                        >
                          <Wand2 className="w-5 h-5" />
                          Importar Lote con AI
                        </Button>
                      </TabsContent>
                    </Tabs>
                  </motion.div>
                )}

                {/* ── STEP: BULK PROCESSING ── */}
                {bulkProcessing && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 py-4">
                    <div className="text-center space-y-2 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto animate-pulse">
                        <Sparkles className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <p className="font-display text-lg font-semibold">Importando productos...</p>
                      <p className="text-sm text-muted-foreground">
                        {bulkResults.filter(r => r.status === 'done').length} / {bulkResults.length} completados
                      </p>
                    </div>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {bulkResults.map((item, i) => (
                        <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                          item.status === 'done' ? 'border-green-500/30 bg-green-500/5' :
                          item.status === 'error' ? 'border-destructive/30 bg-destructive/5' :
                          item.status === 'queued' ? 'border-border bg-secondary/30' :
                          'border-primary/30 bg-primary/5'
                        }`}>
                          <div className="flex-shrink-0">
                            {item.status === 'queued' && <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />}
                            {(item.status === 'scraping' || item.status === 'generating' || item.status === 'saving') && (
                              <Loader2 className="w-5 h-5 text-primary animate-spin" />
                            )}
                            {item.status === 'done' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                            {item.status === 'error' && <AlertCircle className="w-5 h-5 text-destructive" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-mono truncate">{item.url}</p>
                            {item.name && <p className="text-xs text-muted-foreground">{item.name}</p>}
                            {item.error && <p className="text-xs text-destructive">{item.error}</p>}
                          </div>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex-shrink-0">
                            {item.status === 'queued' && 'En cola'}
                            {item.status === 'scraping' && '🔄 Scraping'}
                            {item.status === 'generating' && '🖼️ Imagen'}
                            {item.status === 'saving' && '💾 Guardando'}
                            {item.status === 'done' && '✅ Creado'}
                            {item.status === 'error' && '❌ Error'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* ── BULK RESULTS (after processing) ── */}
                {!bulkProcessing && bulkResults.length > 0 && aiStep === 'source' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 py-4">
                    <div className="text-center space-y-2 mb-4">
                      <p className="font-display text-lg font-semibold">Importación completada</p>
                      <p className="text-sm text-muted-foreground">
                        {bulkResults.filter(r => r.status === 'done').length} creados · {bulkResults.filter(r => r.status === 'error').length} errores
                      </p>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {bulkResults.map((item, i) => (
                        <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${
                          item.status === 'done' ? 'border-green-500/30 bg-green-500/5' : 'border-destructive/30 bg-destructive/5'
                        }`}>
                          {item.status === 'done' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <AlertCircle className="w-5 h-5 text-destructive" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{item.name || item.url}</p>
                            {item.error && <p className="text-xs text-destructive">{item.error}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button onClick={resetAi} variant="outline" className="w-full">Cerrar</Button>
                  </motion.div>
                )}

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
                            <Upload className="w-3 h-3" /> Subir Foto
                          </Button>
                        </div>
                      </div>

                      {/* Right: Editable fields (Spanish-first) */}
                      <div className="space-y-4">
                        {/* Spanish Name */}
                        <div className="space-y-1">
                          <Label className="text-xs">Nombre</Label>
                          <Input value={aiData.name_es} onChange={(e) => setAiData({ ...aiData, name_es: e.target.value })} className="bg-secondary text-sm" />
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
                            <Select value={aiData.suggested_category} onValueChange={(v) => {
                              if (v === '__new__') {
                                setNewCategoryName('');
                              } else {
                                setAiData({ ...aiData, suggested_category: v });
                              }
                            }}>
                              <SelectTrigger className="bg-secondary text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                              <SelectContent>
                                {categories.map((c: any) => (
                                  <SelectItem key={c.id} value={c.slug}>{c.name_es}</SelectItem>
                                ))}
                                <SelectItem value="__new__">+ Crear nueva categoría</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Inline new category creation */}
                        {(aiData.suggested_category === '__new__' || (!categories.find((c: any) => c.slug === aiData.suggested_category) && aiData.suggested_category)) && (
                          <div className="flex gap-2 items-end">
                            <div className="flex-1 space-y-1">
                              <Label className="text-xs">Nueva categoría</Label>
                              <Input
                                value={newCategoryName || aiData.suggested_category_name_es || ''}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className="bg-secondary text-sm"
                                placeholder="Nombre de la categoría"
                              />
                            </div>
                            <Button size="sm" onClick={handleCreateCategory} disabled={creatingCategory} className="gap-1">
                              <Plus className="w-3 h-3" /> Crear
                            </Button>
                          </div>
                        )}

                        {/* Materials Multi-Select */}
                        <div className="space-y-2">
                          <Label className="text-xs">Materiales</Label>
                          <div className="flex flex-wrap gap-2 p-2 rounded-lg bg-secondary border border-border min-h-[40px]">
                            {materials.map((m: any) => {
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
                                        setAiData((prev: any) => ({ ...prev, materials: [...(prev.materials || []), matName] }));
                                      } else {
                                        setAiData((prev: any) => ({ ...prev, materials: (prev.materials || []).filter((mat: string) => mat.toLowerCase() !== m.name_es.toLowerCase() && mat.toLowerCase() !== m.name_en.toLowerCase()) }));
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
                                        setAiData((prev: any) => ({ ...prev, colors: [...(prev.colors || []), color] }));
                                      } else {
                                        setAiData((prev: any) => ({ ...prev, colors: (prev.colors || []).filter((c: string) => c.toLowerCase() !== color.toLowerCase()) }));
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
                        onClick={handleAiSaveProduct}
                        className="flex-1 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground gap-2 font-semibold"
                      >
                        <Plus className="w-4 h-4" />
                        Crear Producto
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* ── ADD/EDIT PRODUCT DIALOG ── */}
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm(empty); setMediaFiles([]); setFieldErrors({}); setProductVariations([]); setEditAiImageOpen(false); setEditAiSourceImage(null); setEditAiCustomBg(null); } }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground gap-2"><Plus className="w-4 h-4" />Agregar Producto</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-display">{editId ? 'Editar' : 'Agregar'} Producto</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="space-y-5">

                {/* ── AI ENHANCE BUTTON ── */}
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
                {editEnhancing && (
                  <p className="text-xs text-muted-foreground text-center">
                    La AI generará nombre, descripción, traducción, categoría y slug automáticamente
                  </p>
                )}

                {/* ── MEDIA UPLOAD ZONE (TOP) ── */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 font-semibold">
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
                        onClick={() => setEditAiImageOpen(!editAiImageOpen)}
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
                                <Label className="text-xs font-semibold flex items-center gap-1">
                                  <ImagePlus className="w-3 h-3 text-primary" />
                                  Foto original del producto
                                </Label>
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
                                <div className="flex gap-2">
                                  {[
                                    { value: 'system', label: 'Estudio Maker', badge: '★' },
                                    { value: 'ai', label: 'Exhibición Tech', badge: null },
                                    { value: 'custom', label: 'Personalizado', badge: null },
                                  ].map((opt) => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => setEditAiBgMode(opt.value as any)}
                                      className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${editAiBgMode === opt.value ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-background border border-border hover:border-primary/30'}`}
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
                                disabled={!editAiSourceImage || editAiGenerating}
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

                {/* ── PRODUCT FIELDS ── */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre (ES)</Label>
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
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="bg-secondary" maxLength={255} required />
                    {fieldErrors.slug && <p className="text-xs text-destructive">{fieldErrors.slug}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Precio Base ($)</Label>
                    <Input type="number" step="0.01" min="0" max="999999" value={form.base_price} onFocus={(e) => e.target.select()} onChange={(e) => setForm({ ...form, base_price: parseFloat(e.target.value) || 0 })} className="bg-secondary" required />
                    {fieldErrors.base_price && <p className="text-xs text-destructive">{fieldErrors.base_price}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                      <SelectTrigger className="bg-secondary"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name_es}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: c })} /><Label>Activo</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={form.is_featured} onCheckedChange={(c) => setForm({ ...form, is_featured: c })} /><Label>Destacado</Label></div>
                </div>

                {/* ── VARIATIONS (Size/Weight) ── */}
                <div className="space-y-3 border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 font-semibold">
                      <Ruler className="w-4 h-4 text-primary" />
                      Variaciones de Tamaño
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setProductVariations(prev => [...prev, {
                        name_en: '', name_es: '', type: 'size', weight_grams: 0, material_id: '', dimensions: '', is_active: true, _isNew: true,
                      }])}
                      className="gap-1 text-xs"
                    >
                      <Plus className="w-3 h-3" /> Agregar Variación
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Agrega variaciones de tamaño con su peso en gramos. El precio se calcula automáticamente: (peso / 1000) × costo por KG del material.
                  </p>

                  {productVariations.filter(v => !v._deleted).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">Sin variaciones. El producto usará solo el precio base.</p>
                  )}

                  {productVariations.filter(v => !v._deleted).map((variation, idx) => {
                    const actualIdx = productVariations.indexOf(variation);
                    const selectedMat = materials.find((m: any) => m.id === variation.material_id);
                    const costPerKg = selectedMat ? Number(selectedMat.cost_per_kg || 0) : 0;
                    const calcPrice = variation.weight_grams > 0 && costPerKg > 0
                      ? (variation.weight_grams / 1000) * costPerKg
                      : 0;

                    return (
                      <div key={idx} className="p-3 rounded-lg bg-secondary/50 border border-border space-y-3">
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
                                disabled={!variation.name_es}
                                className="text-[10px] h-5 px-1.5 gap-0.5 text-primary"
                              >
                                <RefreshCw className="w-2.5 h-2.5" /> AI
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
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Material</Label>
                            <Select
                              value={variation.material_id}
                              onValueChange={(v) => {
                                setProductVariations(prev => {
                                  const updated = [...prev];
                                  updated[actualIdx] = { ...updated[actualIdx], material_id: v };
                                  return updated;
                                });
                              }}
                            >
                              <SelectTrigger className="bg-background text-sm h-8"><SelectValue placeholder="—" /></SelectTrigger>
                              <SelectContent>
                                {materials.map((m: any) => (
                                  <SelectItem key={m.id} value={m.id}>{m.name_es} (${Number(m.cost_per_kg || 0).toFixed(0)}/kg)</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Precio Calc.</Label>
                            <div className="h-8 flex items-center px-3 rounded-md bg-background border border-input text-sm font-medium text-primary">
                              {calcPrice > 0 ? `$${calcPrice.toFixed(2)}` : '—'}
                            </div>
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

                <Button type="submit" disabled={save.isPending} className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                  {save.isPending ? '...' : 'Guardar Producto'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Bulk Edit Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {bulkEditMode && bulkEditCount > 0 && (
            <span className="text-sm text-muted-foreground">{bulkEditCount} producto(s) modificado(s)</span>
          )}
        </div>
        <div className="flex gap-2">
          {bulkEditMode ? (
            <>
              <Button variant="outline" size="sm" onClick={() => { setBulkEditMode(false); setBulkEdits({}); }} className="gap-1">
                <XCircle className="w-4 h-4" /> Cancelar
              </Button>
              <Button size="sm" onClick={handleBulkSave} disabled={bulkSaving || bulkEditCount === 0} className="gap-1 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                <Save className="w-4 h-4" /> {bulkSaving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setBulkEditMode(true)} className="gap-1">
              <Pencil className="w-3 h-3" /> Editar en Bulk
            </Button>
          )}
        </div>
      </div>

      {/* ── PRODUCTS TABLE ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead>Producto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p: any) => (
              <TableRow key={p.id} className={`border-border ${bulkEdits[p.id] ? 'bg-primary/5' : ''}`}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {(p.images as string[])?.length > 0 ? (
                      <img src={(p.images as string[])[0]} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center"><Image className="w-4 h-4 text-muted-foreground" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      {bulkEditMode ? (
                        <Input
                          value={getBulkValue(p.id, 'name_es', p.name_es)}
                          onChange={(e) => setBulkField(p.id, 'name_es', e.target.value, p.name_es)}
                          className="bg-secondary text-sm h-8"
                        />
                      ) : (
                        <>
                          <p className="font-medium">{p.name_es}</p>
                          <p className="text-xs text-muted-foreground">{p.slug}</p>
                        </>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {bulkEditMode ? (
                    <Select
                      value={getBulkValue(p.id, 'category_id', p.category_id || '') || ''}
                      onValueChange={(v) => setBulkField(p.id, 'category_id', v || null, p.category_id || '')}
                    >
                      <SelectTrigger className="bg-secondary text-sm h-8 w-[140px]"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name_es}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-muted-foreground">{p.categories ? p.categories.name_es : '—'}</span>
                  )}
                </TableCell>
                <TableCell>
                  {bulkEditMode ? (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={getBulkValue(p.id, 'base_price', p.base_price)}
                      onChange={(e) => setBulkField(p.id, 'base_price', parseFloat(e.target.value) || 0, p.base_price)}
                      className="bg-secondary text-sm h-8 w-[100px]"
                    />
                  ) : (
                    <span className="font-medium">${Number(p.base_price).toFixed(2)}</span>
                  )}
                </TableCell>
                <TableCell>
                  {bulkEditMode ? (
                    <Switch
                      checked={getBulkValue(p.id, 'is_active', p.is_active)}
                      onCheckedChange={(c) => setBulkField(p.id, 'is_active', c, p.is_active)}
                    />
                  ) : (
                    <div className="flex gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${p.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {p.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                      {p.is_featured && <span className="px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary">★</span>}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {!bulkEditMode && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => del.mutate(p.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {products.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No hay productos aún.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
