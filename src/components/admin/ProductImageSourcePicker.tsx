import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, ImageIcon, Search, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ProductRow {
  id: string;
  name_en: string;
  name_es: string;
  base_price: number;
  images: any;
  category_id: string | null;
}

interface Props {
  value: string;
  onChange: (url: string) => void;
  /** When true, hides the Product Library tab (used for custom background picker). */
  hideLibrary?: boolean;
  /** When true, shows the Composed Results tab (admin-only contexts). */
  showComposedResults?: boolean;
  /** Storage folder under product-images bucket. */
  uploadFolder?: string;
  label?: string;
}

interface ComposedRow {
  id: string;
  composed_image_url: string;
  method: string;
  preset: string | null;
  created_at: string;
  product_id: string | null;
}


const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export default function ProductImageSourcePicker({
  value,
  onChange,
  hideLibrary = false,
  showComposedResults = false,
  uploadFolder = 'background-qa-sources',
  label,
}: Props) {
  type TabKey = 'library' | 'upload' | 'url' | 'composed';
  const [tab, setTab] = useState<TabKey>(hideLibrary ? 'upload' : 'library');
  const [urlInput, setUrlInput] = useState(value || '');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Library state
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Composed Results state
  const [composed, setComposed] = useState<ComposedRow[]>([]);
  const [loadingComposed, setLoadingComposed] = useState(false);
  const [composedFilter, setComposedFilter] = useState<'all' | 'ai' | 'safe_retry' | 'non_ai'>('all');


  useEffect(() => {
    setUrlInput(value || '');
  }, [value]);

  useEffect(() => {
    if (hideLibrary || tab !== 'library' || products.length) return;
    (async () => {
      setLoadingProducts(true);
      const { data, error } = await supabase
        .from('products')
        .select('id, name_en, name_es, base_price, images, category_id')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(200);
      if (error) toast.error(error.message);
      else setProducts((data || []) as ProductRow[]);
      setLoadingProducts(false);
    })();
  }, [tab, hideLibrary, products.length]);

  useEffect(() => {
    if (!showComposedResults || tab !== 'composed' || composed.length) return;
    (async () => {
      setLoadingComposed(true);
      const { data, error } = await supabase
        .from('background_composition_results')
        .select('id, composed_image_url, method, preset, created_at, product_id')
        .order('created_at', { ascending: false })
        .limit(120);
      if (error) toast.error(error.message);
      else setComposed((data || []) as ComposedRow[]);
      setLoadingComposed(false);
    })();
  }, [tab, showComposedResults, composed.length]);


  const filteredProducts = products.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name_en?.toLowerCase().includes(q) ||
      p.name_es?.toLowerCase().includes(q)
    );
  });

  const getProductImages = (p: ProductRow): string[] => {
    if (!p.images) return [];
    if (Array.isArray(p.images)) return p.images.filter((x) => typeof x === 'string');
    return [];
  };

  const handleFile = async (file: File) => {
    const ALLOWED_EXT = /\.(png|jpe?g|webp)$/i;
    if (!file.type.startsWith('image/') || !ALLOWED_EXT.test(file.name)) {
      toast.error('Only PNG, JPG, JPEG, or WEBP images are allowed');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Image too large (max 10MB)');
      return;
    }

    setUploading(true);
    toast.info('Uploading image...');
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id || 'anon';
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${uploadFolder}/${uid}/${Date.now()}-${cleanName}`;
      const { error } = await supabase.storage
        .from('product-images')
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('product-images').getPublicUrl(path);
      onChange(pub.publicUrl);
      setUrlInput(pub.publicUrl);
      toast.success('Image uploaded and ready for preview.');
    } catch (e: any) {
      console.error('[ProductImageSourcePicker] upload failed', e);
      toast.error('Upload failed. Please try another image.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList
          className={`grid w-full grid-cols-${(hideLibrary ? 0 : 1) + 2 + (showComposedResults ? 1 : 0)}`}
        >
          {!hideLibrary && <TabsTrigger value="library">Product Library</TabsTrigger>}
          <TabsTrigger value="upload">Upload Image</TabsTrigger>
          <TabsTrigger value="url">Image URL</TabsTrigger>
          {showComposedResults && <TabsTrigger value="composed">Composed Results</TabsTrigger>}
        </TabsList>


        {!hideLibrary && (
          <TabsContent value="library" className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {loadingProducts ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : (
              <div className="max-h-72 overflow-y-auto border rounded p-2 space-y-2">
                {filteredProducts.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No products found.</p>
                )}
                {filteredProducts.map((p) => {
                  const imgs = getProductImages(p);
                  const main = imgs[0];
                  const selected = selectedProductId === p.id;
                  return (
                    <div key={p.id} className={`border rounded p-2 ${selected ? 'ring-2 ring-primary' : ''}`}>
                      <div className="flex gap-2 items-center">
                        <div className="w-12 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
                          {main ? (
                            <img src={main} alt={p.name_en} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-5 h-5 m-auto text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{p.name_en}</p>
                          <p className="text-[10px] text-muted-foreground">${Number(p.base_price).toFixed(2)}</p>
                        </div>
                        {main && (
                          <Button
                            size="sm"
                            variant={value === main ? 'default' : 'outline'}
                            className="h-7 text-[10px]"
                            onClick={() => {
                              setSelectedProductId(p.id);
                              onChange(main);
                              setUrlInput(main);
                            }}
                          >
                            {value === main ? <><Check className="w-3 h-3 mr-1" /> Selected</> : 'Use'}
                          </Button>
                        )}
                      </div>
                      {selected && imgs.length > 1 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {imgs.map((src) => (
                            <button
                              key={src}
                              type="button"
                              onClick={() => {
                                onChange(src);
                                setUrlInput(src);
                              }}
                              className={`w-10 h-10 rounded overflow-hidden border-2 ${value === src ? 'border-primary' : 'border-transparent'}`}
                            >
                              <img src={src} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        )}

        <TabsContent value="upload" className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
          <Button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading image...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> Choose image from device</>
            )}
          </Button>
          <p className="text-[10px] text-muted-foreground">
            Max 10MB. PNG, JPG, WEBP. Works with iPad Photo Library & Files.
          </p>
        </TabsContent>

        <TabsContent value="url" className="space-y-2">
          <Input
            placeholder="https://..."
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value);
              onChange(e.target.value);
            }}
          />
        </TabsContent>
      </Tabs>

      {value && (
        <div className="flex gap-2 items-start mt-2">
          <div className="w-20 h-20 bg-muted rounded border overflow-hidden flex-shrink-0">
            <img src={value} alt="selected" className="w-full h-full object-cover" />
          </div>
          <div className="text-[10px] text-muted-foreground break-all flex-1">
            {value}
          </div>
        </div>
      )}
    </div>
  );
}
