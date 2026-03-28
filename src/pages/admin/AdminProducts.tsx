import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Image, Sparkles, Link2, Upload, X, GripVertical, Video, Film, RefreshCw, Wand2, ImagePlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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

// ── Helpers ──
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
  const [aiData, setAiData] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiImageLoading, setAiImageLoading] = useState(false);
  const [aiExtractedImages, setAiExtractedImages] = useState<string[]>([]);
  const [aiSelectedSourceImage, setAiSelectedSourceImage] = useState<string | null>(null);
  const aiOriginalInputRef = useRef<HTMLInputElement>(null);
  const aiBgInputRef = useRef<HTMLInputElement>(null);

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
      toast({ title: `Maximum ${MAX_MEDIA} files allowed`, variant: 'destructive' });
      return;
    }
    const toAdd = Array.from(files).slice(0, remaining);
    const newItems: MediaItem[] = [];
    for (const file of toAdd) {
      const validation = await validateMediaFile(file);
      if (!validation.valid) {
        toast({ title: validation.error || 'Invalid file', variant: 'destructive' });
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

  // Drag and drop reorder
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

  // Drop zone
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
        // Upload new files and collect all URLs in order
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
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['admin-product-count'] });
      setOpen(false);
      setEditId(null);
      setForm(empty);
      setMediaFiles([]);
      toast({ title: '✓', description: 'Product saved.' });
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
      toast({ title: '✓', description: 'Product deleted.' });
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
    // Pre-populate existing images
    const existingImages = (p.images as string[]) || [];
    setMediaFiles(existingImages.map((url, i) => ({
      id: `existing-${i}`,
      preview: url,
      type: getMediaTypeFromUrl(url),
      isExisting: true,
    })));
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
    setAiData(null);
    setAiExtractedImages([]);
    setAiSelectedSourceImage(null);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleAiScrape = async () => {
    if (!aiUrl) {
      toast({ title: 'Provide a URL', variant: 'destructive' });
      return;
    }
    const sanitized = sanitizeUrl(aiUrl);
    if (!sanitized) {
      toast({ title: 'Invalid URL format', variant: 'destructive' });
      return;
    }

    setAiStep('loading');
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-product-import', {
        body: { action: 'scrape', url: aiUrl },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Scraping failed');

      setAiData(data.data);
      setAiExtractedImages(data.data.extracted_images || []);
      if (data.data.extracted_images?.length > 0) {
        setAiSelectedSourceImage(data.data.extracted_images[0]);
      }
      setAiStep('review');
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
      toast({ title: 'No source image available', variant: 'destructive' });
      return;
    }

    setAiImageLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-product-import', {
        body: {
          action: 'generate_image',
          sourceImage,
          customBackground: aiCustomBg || undefined,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Image generation failed');
      setAiGeneratedImage(data.data.generated_image);
      toast({ title: '✓', description: 'AI image generated!' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setAiImageLoading(false);
    }
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

  const handleAiSaveProduct = async () => {
    if (!aiData) return;
    const matchedCat = categories.find((c: any) => c.slug === aiData.suggested_category);

    setForm({
      name_en: aiData.name_en || '',
      name_es: aiData.name_es || '',
      description_en: aiData.description_en || '',
      description_es: aiData.description_es || '',
      slug: aiData.slug || '',
      base_price: aiData.suggested_price || 0,
      category_id: matchedCat?.id || '',
      is_active: true,
      is_featured: false,
    });

    // If we have a generated image, convert to file and add to media
    if (aiGeneratedImage) {
      try {
        const resp = await fetch(aiGeneratedImage);
        const blob = await resp.blob();
        const file = new File([blob], 'ai-generated.png', { type: 'image/png' });
        setMediaFiles([{
          id: `ai-${Date.now()}`,
          file,
          preview: aiGeneratedImage,
          type: 'image',
        }]);
      } catch {
        setMediaFiles([]);
      }
    } else {
      setMediaFiles([]);
    }

    setAiOpen(false);
    resetAi();
    setOpen(true);
    toast({ title: '✓', description: 'AI data loaded. Review and save.' });
  };

  // ══════════════════════════════════════════════════════════
  // ── RENDER ──
  // ══════════════════════════════════════════════════════════

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Products</h1>
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
              {/* AI Header */}
              <div className="p-6 pb-0">
                <DialogHeader>
                  <DialogTitle className="font-display flex items-center gap-2 text-xl">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-primary-foreground" />
                    </div>
                    AI Product Import Studio
                  </DialogTitle>
                </DialogHeader>
              </div>

              <div className="p-6 pt-4">
                {/* ── STEP: SOURCE ── */}
                {aiStep === 'source' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-semibold">
                          <Link2 className="w-4 h-4 text-primary" />
                          Reference URL
                        </Label>
                        <Input
                          value={aiUrl}
                          onChange={(e) => setAiUrl(e.target.value)}
                          placeholder="https://www.thingiverse.com/thing/..."
                          className="bg-background"
                          maxLength={2000}
                        />
                        <p className="text-xs text-muted-foreground">Paste a link to a 3D model from Thingiverse, MyMiniFactory, Cults3D, etc.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-3">
                        <Label className="flex items-center gap-2 text-sm font-semibold">
                          <ImagePlus className="w-4 h-4 text-primary" />
                          Original Product Photo (optional)
                        </Label>
                        <p className="text-xs text-muted-foreground">Upload the original product image for AI to enhance</p>
                        {aiOriginalImage ? (
                          <div className="relative">
                            <img src={aiOriginalImage} alt="Original" className="w-full h-32 object-cover rounded-lg" />
                            <button onClick={() => { setAiOriginalImage(null); setAiOriginalImageFile(null); }} className="absolute top-1 right-1 w-6 h-6 bg-destructive rounded-full flex items-center justify-center"><X className="w-3 h-3 text-white" /></button>
                          </div>
                        ) : (
                          <button onClick={() => aiOriginalInputRef.current?.click()} className="w-full h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors">
                            <Upload className="w-5 h-5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Click to upload</span>
                          </button>
                        )}
                        <input ref={aiOriginalInputRef} type="file" accept="image/*" onChange={handleAiOriginalUpload} className="hidden" />
                      </div>

                      <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-3">
                        <Label className="flex items-center gap-2 text-sm font-semibold">
                          <Image className="w-4 h-4 text-primary" />
                          Custom Background (optional)
                        </Label>
                        <p className="text-xs text-muted-foreground">Upload a branded background for the AI-generated image</p>
                        {aiCustomBg ? (
                          <div className="relative">
                            <img src={aiCustomBg} alt="Background" className="w-full h-32 object-cover rounded-lg" />
                            <button onClick={() => { setAiCustomBg(null); setAiCustomBgFile(null); }} className="absolute top-1 right-1 w-6 h-6 bg-destructive rounded-full flex items-center justify-center"><X className="w-3 h-3 text-white" /></button>
                          </div>
                        ) : (
                          <button onClick={() => aiBgInputRef.current?.click()} className="w-full h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors">
                            <Upload className="w-5 h-5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Click to upload</span>
                          </button>
                        )}
                        <input ref={aiBgInputRef} type="file" accept="image/*" onChange={handleAiBgUpload} className="hidden" />
                      </div>
                    </div>

                    <Button
                      onClick={handleAiScrape}
                      disabled={!aiUrl}
                      className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground gap-2 text-base font-semibold"
                    >
                      <Wand2 className="w-5 h-5" />
                      Extract & Generate with AI
                    </Button>
                  </motion.div>
                )}

                {/* ── STEP: LOADING ── */}
                {aiStep === 'loading' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center animate-pulse">
                      <Sparkles className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-display text-lg font-semibold">Analyzing & Generating...</p>
                      <p className="text-sm text-muted-foreground">Scraping reference URL and creating product data with AI</p>
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
                        <Label className="text-sm font-semibold">AI Generated Image</Label>

                        {/* Source image selection */}
                        {(aiExtractedImages.length > 0 || aiOriginalImage) && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Source image for AI generation:</p>
                            <div className="flex gap-2 flex-wrap">
                              {aiOriginalImage && (
                                <button
                                  onClick={() => setAiSelectedSourceImage(null)}
                                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${!aiSelectedSourceImage ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}
                                >
                                  <img src={aiOriginalImage} alt="" className="w-full h-full object-cover" />
                                </button>
                              )}
                              {aiExtractedImages.map((img, i) => (
                                <button
                                  key={i}
                                  onClick={() => { setAiSelectedSourceImage(img); setAiOriginalImage(null); }}
                                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${aiSelectedSourceImage === img ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}
                                >
                                  <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Generated image preview */}
                        <div className="aspect-square rounded-xl overflow-hidden bg-secondary border border-border">
                          {aiGeneratedImage ? (
                            <img src={aiGeneratedImage} alt="AI Generated" className="w-full h-full object-contain" />
                          ) : (aiOriginalImage || aiSelectedSourceImage) ? (
                            <img src={aiOriginalImage || aiSelectedSourceImage!} alt="Source" className="w-full h-full object-contain opacity-60" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <p className="text-sm text-muted-foreground">No image available</p>
                            </div>
                          )}
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
                            {aiGeneratedImage ? 'Regenerate Image' : 'Generate AI Image'}
                          </Button>
                        </div>

                        {/* Upload different source */}
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => aiOriginalInputRef.current?.click()} className="text-xs gap-1">
                            <Upload className="w-3 h-3" /> Upload Photo
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => aiBgInputRef.current?.click()} className="text-xs gap-1">
                            <Image className="w-3 h-3" /> {aiCustomBg ? 'Change BG' : 'Custom BG'}
                          </Button>
                        </div>
                      </div>

                      {/* Right: Editable fields */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Name (EN)</Label>
                            <Input value={aiData.name_en} onChange={(e) => setAiData({ ...aiData, name_en: e.target.value })} className="bg-secondary text-sm" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Name (ES)</Label>
                            <Input value={aiData.name_es} onChange={(e) => setAiData({ ...aiData, name_es: e.target.value })} className="bg-secondary text-sm" />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Description (EN)</Label>
                          <Textarea value={aiData.description_en} onChange={(e) => setAiData({ ...aiData, description_en: e.target.value })} className="bg-secondary text-sm" rows={3} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Description (ES)</Label>
                          <Textarea value={aiData.description_es} onChange={(e) => setAiData({ ...aiData, description_es: e.target.value })} className="bg-secondary text-sm" rows={3} />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Slug</Label>
                            <Input value={aiData.slug} onChange={(e) => setAiData({ ...aiData, slug: e.target.value })} className="bg-secondary text-sm" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Price ($)</Label>
                            <Input type="number" step="0.01" value={aiData.suggested_price} onChange={(e) => setAiData({ ...aiData, suggested_price: parseFloat(e.target.value) || 0 })} className="bg-secondary text-sm" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Category</Label>
                            <Select value={aiData.suggested_category} onValueChange={(v) => setAiData({ ...aiData, suggested_category: v })}>
                              <SelectTrigger className="bg-secondary text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {categories.map((c: any) => (
                                  <SelectItem key={c.id} value={c.slug}>{language === 'es' ? c.name_es : c.name_en}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Materials & Colors */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Materials</Label>
                            <Input
                              value={(aiData.materials || []).join(', ')}
                              onChange={(e) => setAiData({ ...aiData, materials: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })}
                              className="bg-secondary text-sm"
                              placeholder="PLA, ABS, PETG"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Colors</Label>
                            <Input
                              value={(aiData.colors || []).join(', ')}
                              onChange={(e) => setAiData({ ...aiData, colors: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })}
                              className="bg-secondary text-sm"
                              placeholder="Black, White, Gold"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button variant="outline" onClick={() => { setAiStep('source'); }} className="flex-1">
                        ← Back
                      </Button>
                      <Button
                        onClick={handleAiSaveProduct}
                        className="flex-1 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground gap-2 font-semibold"
                      >
                        <Plus className="w-4 h-4" />
                        Create Product
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* ── ADD/EDIT PRODUCT DIALOG ── */}
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm(empty); setMediaFiles([]); setFieldErrors({}); } }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground gap-2"><Plus className="w-4 h-4" />Add Product</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-display">{editId ? 'Edit' : 'Add'} Product</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="space-y-5">

                {/* ── MEDIA UPLOAD ZONE (TOP) ── */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 font-semibold">
                    <Film className="w-4 h-4 text-primary" />
                    Media ({mediaFiles.length}/{MAX_MEDIA})
                  </Label>

                  {/* Thumbnails Grid */}
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

                    {/* Drop zone / Add button */}
                    {mediaFiles.length < MAX_MEDIA && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDropZone}
                        className="w-24 h-24 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-colors bg-secondary/30"
                      >
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground text-center leading-tight">Drop or<br />click</span>
                      </button>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT_MEDIA}
                    multiple
                    onChange={(e) => { if (e.target.files) handleMediaAdd(e.target.files); e.target.value = ''; }}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground">JPG, PNG, WebP, GIF, MP4, WebM · Images max 5MB · Videos max 20MB · Drag to reorder</p>
                </div>

                {/* ── PRODUCT FIELDS ── */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name (EN)</Label>
                    <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} className="bg-secondary" maxLength={255} required />
                    {fieldErrors.name_en && <p className="text-xs text-destructive">{fieldErrors.name_en}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Name (ES)</Label>
                    <Input value={form.name_es} onChange={(e) => setForm({ ...form, name_es: e.target.value })} className="bg-secondary" maxLength={255} required />
                    {fieldErrors.name_es && <p className="text-xs text-destructive">{fieldErrors.name_es}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description (EN)</Label>
                  <Textarea value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} className="bg-secondary" rows={3} maxLength={2000} />
                </div>
                <div className="space-y-2">
                  <Label>Description (ES)</Label>
                  <Textarea value={form.description_es} onChange={(e) => setForm({ ...form, description_es: e.target.value })} className="bg-secondary" rows={3} maxLength={2000} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="bg-secondary" maxLength={255} required />
                    {fieldErrors.slug && <p className="text-xs text-destructive">{fieldErrors.slug}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Base Price ($)</Label>
                    <Input type="number" step="0.01" min="0" max="999999" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: parseFloat(e.target.value) || 0 })} className="bg-secondary" required />
                    {fieldErrors.base_price && <p className="text-xs text-destructive">{fieldErrors.base_price}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                      <SelectTrigger className="bg-secondary"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{language === 'es' ? c.name_es : c.name_en}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: c })} /><Label>Active</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={form.is_featured} onCheckedChange={(c) => setForm({ ...form, is_featured: c })} /><Label>Featured</Label></div>
                </div>
                <Button type="submit" disabled={save.isPending} className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                  {save.isPending ? '...' : 'Save Product'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── PRODUCTS TABLE ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p: any) => (
              <TableRow key={p.id} className="border-border">
                <TableCell>
                  <div className="flex items-center gap-3">
                    {(p.images as string[])?.length > 0 ? (
                      <img src={(p.images as string[])[0]} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center"><Image className="w-4 h-4 text-muted-foreground" /></div>
                    )}
                    <div>
                      <p className="font-medium">{language === 'es' ? p.name_es : p.name_en}</p>
                      <p className="text-xs text-muted-foreground">{p.slug}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.categories ? (language === 'es' ? p.categories.name_es : p.categories.name_en) : '—'}
                </TableCell>
                <TableCell className="font-medium">${Number(p.base_price).toFixed(2)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${p.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {p.is_featured && <span className="px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary">★</span>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(p.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {products.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No products yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
