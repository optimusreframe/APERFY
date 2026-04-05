import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export type BulkItemStatus = 'queued' | 'scraping' | 'generating' | 'saving' | 'done' | 'error';

export interface BulkItem {
  url: string;
  status: BulkItemStatus;
  name?: string;
  error?: string;
}

interface BulkImportContextType {
  isRunning: boolean;
  isComplete: boolean;
  items: BulkItem[];
  startBulkImport: (urls: string[], categories: any[], systemBgSetting: string | null) => void;
  dismiss: () => void;
}

const BulkImportContext = createContext<BulkImportContextType | null>(null);

export function useBulkImport() {
  const ctx = useContext(BulkImportContext);
  if (!ctx) throw new Error('useBulkImport must be used within BulkImportProvider');
  return ctx;
}

function slugify(text: string): string {
  return text.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function persistAiImage(imageSource: string): Promise<{ url: string; path: string }> {
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
}

export function BulkImportProvider({ children }: { children: ReactNode }) {
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [items, setItems] = useState<BulkItem[]>([]);
  const qc = useQueryClient();
  const runningRef = useRef(false);

  const dismiss = useCallback(() => {
    setIsComplete(false);
    setItems([]);
  }, []);

  const startBulkImport = useCallback((urls: string[], categories: any[], systemBgSetting: string | null) => {
    if (runningRef.current) return;
    runningRef.current = true;
    setIsRunning(true);
    setIsComplete(false);
    setItems(urls.map(url => ({ url, status: 'queued' as BulkItemStatus })));

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    (async () => {
      let created = 0;
      let errors = 0;

      for (let i = 0; i < urls.length; i++) {
        const currentUrl = urls[i];
        try {
          // Step 1: Scrape
          setItems(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'scraping' } : r));
          const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke('ai-product-import', {
            body: {
              action: 'scrape',
              url: currentUrl,
              existingCategories: categories.map((c: any) => ({ slug: c.slug, name_en: c.name_en, name_es: c.name_es })),
            },
          });
          if (scrapeError || !scrapeData?.success) throw new Error(scrapeData?.error || 'Scrape failed');
          const productInfo = scrapeData.data;

          setItems(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'generating', name: productInfo.name_es } : r));

          // Step 2: Generate image
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
              // Continue without image
            }
          }

          // Step 3: Save product
          setItems(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'saving' } : r));
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

          setItems(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'done' } : r));
          created++;
        } catch (e: any) {
          setItems(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'error', error: e.message } : r));
          errors++;
        }
      }

      setIsRunning(false);
      setIsComplete(true);
      runningRef.current = false;
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['admin-product-count'] });

      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Importación Completada', {
          body: `${created} productos creados, ${errors} errores`,
          icon: '/favicon.ico',
        });
      }
    })();
  }, [qc]);

  return (
    <BulkImportContext.Provider value={{ isRunning, isComplete, items, startBulkImport, dismiss }}>
      {children}
    </BulkImportContext.Provider>
  );
}
