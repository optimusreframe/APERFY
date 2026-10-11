import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/lib/activity-log';
import { useQueryClient } from '@tanstack/react-query';
import type { Category } from '@/lib/model-types';
import { getErrorMessage } from '@/lib/model-types';
import { calculateVenezuelaUsdPrice } from '@/lib/venezuela-pricing';

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
  startBulkImport: (urls: string[], categories: Category[], systemBgSetting: string | null, globalVenezuelaMarkupPercent?: number) => void;
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

  const startBulkImport = useCallback((urls: string[], categories: Category[], systemBgSetting: string | null, globalVenezuelaMarkupPercent = 40) => {
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
              existingCategories: categories.map((category) => ({ slug: category.slug, name_en: category.name_en, name_es: category.name_es })),
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
                  backgroundMode: 'system_workshop',
                  customBackground: systemBgSetting || undefined,
                },
              });
              if (imgData?.success && typeof imgData.data?.generated_image === 'string') {
                persistedImageUrl = imgData.data.generated_image;
              }
            } catch {
              // Continue without image
            }
          }

          // Step 3: Save product
          setItems(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'saving' } : r));
          const matchedCat = categories.find((category) => category.slug === productInfo.suggested_category);
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
            venezuela_price_usd: calculateVenezuelaUsdPrice({
              usaPrice: Number(productInfo.suggested_price || 0),
              mode: 'global',
              manualMode: 'fixed',
              fixedPrice: 0,
              globalMarkupPercent: globalVenezuelaMarkupPercent,
            }),
            venezuela_price_mode: 'global',
            venezuela_manual_mode: 'fixed',
            venezuela_markup_percent: null,
            category_id: matchedCat?.id || null,
            is_active: true,
            is_featured: false,
            images: persistedImageUrl ? [persistedImageUrl] : [],
          });
          if (insertError) throw insertError;

          setItems(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'done' } : r));
          created++;
          logActivity({
            action: 'bulk_import_item',
            category: 'import',
            entity_type: 'product',
            title: `Producto importado: ${productInfo.name_es || productSlug}`,
            details: `URL: ${currentUrl}`,
            metadata: { url: currentUrl, slug: productSlug },
          });
        } catch (error: unknown) {
          const message = getErrorMessage(error);
          setItems(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'error', error: message } : r));
          errors++;
          logActivity({
            action: 'bulk_import_error',
            category: 'error',
            entity_type: 'product',
            title: `Error importando producto`,
            details: `URL: ${currentUrl}\nError: ${message}`,
            metadata: { url: currentUrl, error: message },
          });
        }
      }

      setIsRunning(false);
      setIsComplete(true);
      runningRef.current = false;
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['admin-product-count'] });
      qc.invalidateQueries({ queryKey: ['admin-logs'] });

      logActivity({
        action: 'bulk_import_complete',
        category: errors > 0 ? 'error' : 'success',
        entity_type: 'product',
        title: `Importación bulk completada: ${created} creados, ${errors} errores`,
        details: `Total URLs: ${urls.length}\nCreados: ${created}\nErrores: ${errors}`,
        metadata: { total: urls.length, created, errors },
      });

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
