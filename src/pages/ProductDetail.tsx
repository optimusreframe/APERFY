import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingCart, Box, ArrowLeft, Minus, Plus, ZoomIn, ZoomOut, X, Weight, Ruler, ChevronLeft, ChevronRight, RotateCcw, Maximize2, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import LikeButton from '@/components/LikeButton';
import ShareMenu from '@/components/ShareMenu';
import ProductReviews from '@/components/ProductReviews';
import { Badge } from '@/components/ui/badge';
import MobileStickyAddToCart from '@/components/mobile/MobileStickyAddToCart';
import { productCommandBarClassName } from './productDetailLayout';
import { getInventoryLabel, getInventoryState, getInventoryStock } from '@/lib/inventory';
import { buildResponsiveImageSources, optimizeImageUrl } from '@/lib/image-url';
import { filterEmptySpecifications } from '@/lib/product-specifications';
import { adjustProductImageZoom, PRODUCT_IMAGE_ZOOM } from './productImageZoom';
import { isProductVideo } from '@/lib/product-media';
import Model3DViewer from '@/components/Model3DViewer';
import type { Category, Material, Product } from '@/lib/model-types';
import type { Database } from '@/integrations/supabase/types';

type Variation = Database['public']['Tables']['product_variations']['Row'];
type ProductMaterialWithMaterial = Database['public']['Tables']['product_materials']['Row'] & {
  materials: Pick<Material, 'name_en' | 'name_es'> | null;
};
type RelatedProduct = Product & { categories: Pick<Category, 'name_en' | 'name_es'> | null };
const PRODUCT_LIGHTBOX_HISTORY_KEY = '__aperfy_product_image_lightbox';



// ─── Lightbox Component ───
function ImageLightbox({
  images,
  initialIndex,
  altText,
  language,
  onClose,
}: {
  images: string[];
  initialIndex: number;
  altText: string;
  language: 'en' | 'es';
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const touchGesture = useRef<{
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    startZoom: number;
    startDistance: number | null;
  } | null>(null);

  const resetZoom = useCallback(() => {
    setZoom(PRODUCT_IMAGE_ZOOM.min);
    setPan({ x: 0, y: 0 });
  }, []);

  const changeZoom = useCallback((delta: number) => {
    setZoom((currentZoom) => {
      const nextZoom = adjustProductImageZoom(currentZoom, delta);
      if (nextZoom === PRODUCT_IMAGE_ZOOM.min) setPan({ x: 0, y: 0 });
      return nextZoom;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') { setIndex(i => (i + 1) % images.length); resetZoom(); }
      if (e.key === 'ArrowLeft') { setIndex(i => (i - 1 + images.length) % images.length); resetZoom(); }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [images.length, onClose, resetZoom]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((currentZoom) => adjustProductImageZoom(currentZoom, -e.deltaY * 0.002));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handlePointerUp = () => setIsDragging(false);
  const getTouchDistance = (touches: React.TouchList) => {
    const [first, second] = [touches.item(0), touches.item(1)];
    if (!first || !second) return null;
    return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
  };
  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    const first = event.touches.item(0);
    if (!first) return;
    touchGesture.current = {
      startX: first.clientX,
      startY: first.clientY,
      lastX: first.clientX,
      lastY: first.clientY,
      startZoom: zoom,
      startDistance: getTouchDistance(event.touches),
    };
  };
  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    const gesture = touchGesture.current;
    const first = event.touches.item(0);
    if (!gesture || !first) return;
    const distance = getTouchDistance(event.touches);
    if (distance && gesture.startDistance) {
      const nextZoom = Math.min(PRODUCT_IMAGE_ZOOM.max, Math.max(PRODUCT_IMAGE_ZOOM.min, gesture.startZoom * (distance / gesture.startDistance)));
      setZoom(nextZoom);
      if (nextZoom === PRODUCT_IMAGE_ZOOM.min) setPan({ x: 0, y: 0 });
      return;
    }
    if (zoom > 1) {
      const deltaX = first.clientX - gesture.lastX;
      const deltaY = first.clientY - gesture.lastY;
      setPan(current => ({ x: current.x + deltaX, y: current.y + deltaY }));
    }
    gesture.lastX = first.clientX;
    gesture.lastY = first.clientY;
  };
  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    const gesture = touchGesture.current;
    touchGesture.current = null;
    if (!gesture || zoom > 1 || gesture.startDistance) return;
    const first = event.changedTouches.item(0);
    if (!first || Math.abs(first.clientX - gesture.startX) < 48 || Math.abs(first.clientX - gesture.startX) < Math.abs(first.clientY - gesture.startY)) return;
    if (first.clientX < gesture.startX) setIndex(i => (i + 1) % images.length);
    else setIndex(i => (i - 1 + images.length) % images.length);
    resetZoom();
  };
  const labels = language === 'es'
    ? { zoomIn: 'Acercar', zoomOut: 'Alejar', reset: 'Restablecer', back: 'Volver', close: 'Cerrar zoom' }
    : { zoomIn: 'Zoom in', zoomOut: 'Zoom out', reset: 'Reset', back: 'Back', close: 'Close zoom' };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={altText}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Close affordance stays reachable in the top thumb zone. */}
      <div className="absolute inset-x-4 top-[calc(env(safe-area-inset-top,0px)+0.75rem)] z-20 flex justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label={labels.close}
          className="min-h-11 min-w-11 rounded-full border border-border/30 bg-card/70 text-foreground shadow-lg backdrop-blur hover:bg-card"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setIndex(i => (i - 1 + images.length) % images.length); resetZoom(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-card/50 backdrop-blur border border-border/30 text-foreground hover:bg-card h-12 w-12"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setIndex(i => (i + 1) % images.length); resetZoom(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-card/50 backdrop-blur border border-border/30 text-foreground hover:bg-card h-12 w-12"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </>
      )}

      {/* Image */}
      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden px-4 pb-28 pt-24 cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {isProductVideo(images[index]) ? (
          <video
            src={images[index]}
            aria-label={altText}
            className="max-w-[95vw] max-h-[85vh] w-auto h-auto object-contain object-center"
            controls
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : (
          <img
            src={images[index]}
            alt={altText}
            className="max-w-[95vw] max-h-[85vh] w-auto h-auto object-contain object-center select-none"
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.2s ease-out',
            }}
            draggable={false}
          />
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+5.75rem)] left-4 right-4 z-10 flex max-w-full justify-center gap-2 overflow-x-auto rounded-xl border border-border/30 bg-card/60 p-2 backdrop-blur-lg">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => { setIndex(i); resetZoom(); }}
              aria-label={`Ver imagen ${i + 1}`}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${i === index ? 'border-primary shadow-[0_0_12px_hsl(var(--primary)/0.4)]' : 'border-transparent opacity-60 hover:opacity-100'}`}
            >
                  <img src={optimizeImageUrl(img, { width: 112, quality: 70 })} alt="" width={56} height={56} decoding="async" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Always-visible mobile-friendly recovery controls. */}
      <div className="absolute inset-x-4 bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] z-20 flex justify-center">
        <div className="flex max-w-full items-center gap-1 rounded-2xl border border-border/40 bg-card/85 p-1.5 shadow-2xl backdrop-blur-xl">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => changeZoom(PRODUCT_IMAGE_ZOOM.step)}
            disabled={zoom >= PRODUCT_IMAGE_ZOOM.max}
            aria-label={labels.zoomIn}
            title={labels.zoomIn}
            className="min-h-11 min-w-11 rounded-xl text-foreground hover:bg-white/[0.08]"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => changeZoom(-PRODUCT_IMAGE_ZOOM.step)}
            disabled={zoom <= PRODUCT_IMAGE_ZOOM.min}
            aria-label={labels.zoomOut}
            title={labels.zoomOut}
            className="min-h-11 rounded-xl px-2.5 text-xs text-foreground hover:bg-white/[0.08]"
          >
            <ZoomOut className="h-4 w-4" />
            <span className="hidden sm:inline">{labels.zoomOut}</span>
          </Button>
          <div className="min-w-11 px-1 text-center font-mono text-xs tabular-nums text-muted-foreground" aria-live="polite">
            {Math.round(zoom * 100)}%
          </div>
          <Button
            variant="ghost"
            onClick={resetZoom}
            disabled={zoom === PRODUCT_IMAGE_ZOOM.min && pan.x === 0 && pan.y === 0}
            aria-label={labels.reset}
            className="min-h-11 rounded-xl px-2.5 text-xs text-foreground hover:bg-white/[0.08]"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">{labels.reset}</span>
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            aria-label={labels.back}
            className="min-h-11 rounded-xl px-2.5 text-xs text-primary hover:bg-primary/[0.12]"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">{labels.back}</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Glass Section ───
function GlassSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      className={`bg-card/40 backdrop-blur-xl border border-border/20 rounded-2xl p-5 ${className}`}
    >
      {children}
    </motion.div>
  );
}

// ─── Skeleton ───
function ProductDetailSkeleton() {
  return (
    <div className="grid xl:grid-cols-2 gap-10">
      <div>
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="flex gap-2 mt-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-20 h-20 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="space-y-6">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-8 w-1/3" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  );
}

// ─── Main ───
export default function ProductDetail() {
  const { slug } = useParams();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const openLightbox = useCallback(() => {
    if (window.history.state?.[PRODUCT_LIGHTBOX_HISTORY_KEY] !== true) {
      window.history.pushState(
        { ...(window.history.state ?? {}), [PRODUCT_LIGHTBOX_HISTORY_KEY]: true },
        '',
        window.location.href,
      );
    }
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    const hasLightboxHistoryEntry = window.history.state?.[PRODUCT_LIGHTBOX_HISTORY_KEY] === true;
    setLightboxOpen(false);
    if (hasLightboxHistoryEntry) window.history.back();
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return;

    const handleBrowserBack = () => setLightboxOpen(false);
    window.addEventListener('popstate', handleBrowserBack);
    return () => window.removeEventListener('popstate', handleBrowserBack);
  }, [lightboxOpen]);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name_en, name_es)')
        .eq('slug', slug!)
        .eq('is_active', true)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: variations = [] } = useQuery({
    queryKey: ['product-variations', product?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variations')
        .select('*')
        .eq('product_id', product!.id)
        .eq('is_active', true);
      if (error) throw error;
      return (data ?? []) as Variation[];
    },
    enabled: !!product?.id,
  });

  const { data: productMaterialsList = [] } = useQuery({
    queryKey: ['product-materials-detail', product?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_materials')
        .select('*, materials(name_en, name_es)')
        .eq('product_id', product!.id);
      if (error) throw error;
      return (data ?? []) as ProductMaterialWithMaterial[];
    },
    enabled: !!product?.id,
  });

  const { data: relatedProducts = [] } = useQuery({
    queryKey: ['related-products', product?.category_id, product?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name_en, name_es)')
        .eq('is_active', true)
        .eq('category_id', product!.category_id!)
        .neq('id', product!.id)
        .limit(4);
      if (error) throw error;
      return (data ?? []) as RelatedProduct[];
    },
    enabled: !!product?.category_id,
  });

  const { data: favorites = [], refetch: refetchFavorites } = useQuery({
    queryKey: ['user-favorites-detail', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from('favorites').select('product_id').eq('user_id', user.id);
      if (error) throw error;
      return data.map((f) => f.product_id);
    },
    enabled: !!user,
  });

  const isFav = product ? favorites.includes(product.id) : false;

  const toggleFavorite = async () => {
    if (!user || !product) {
      toast({ title: language === 'es' ? 'Inicia sesión' : 'Sign in required', variant: 'destructive' });
      return;
    }
    if (isFav) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('product_id', product.id);
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, product_id: product.id });
    }
    refetchFavorites();
  };

  const variationsByType = useMemo(() => variations.reduce<Record<string, Variation[]>>((acc, variation) => {
    if (!acc[variation.type]) acc[variation.type] = [];
    acc[variation.type].push(variation);
    return acc;
  }, {}), [variations]);

  const selectedSizeVar = variations.find((variation) => variation.type === 'size' && variation.id === selectedVariations['size']);

  // Effective price per variation: if use_manual_price + price_override present, use that.
  const effectiveVarPrice = (v: Variation | undefined): number => {
    if (!v) return 0;
    if (v.use_manual_price && v.price_override !== null && v.price_override !== undefined) {
      return Number(v.price_override);
    }
    return Number(v.price_modifier) || 0;
  };

  const priceModifier = Object.values(selectedVariations).reduce((sum, varId) => {
    const v = variations.find((vr) => vr.id === varId);
    return sum + effectiveVarPrice(v);
  }, 0);

  const selectedSizeEffective = effectiveVarPrice(selectedSizeVar);
  const unitPrice = selectedSizeVar && selectedSizeEffective > 0
    ? selectedSizeEffective
    : Number(product?.base_price || 0) + priceModifier;
  const totalPrice = product ? unitPrice * quantity : 0;
  const selectedWeight = selectedSizeVar ? Number(selectedSizeVar.weight_grams || 0) : null;
  const selectedDimensions = selectedSizeVar?.dimensions || null;
  const baseImages = useMemo(() => product ? (Array.isArray(product.images) ? product.images.filter((image): image is string => typeof image === 'string') : []) : [], [product]);

  // If any selected variation has an image_url, show it as the hero image (override)
  const variationImage = useMemo(() => Object.values(selectedVariations)
    .map(varId => variations.find((vr) => vr.id === varId))
    .find((variation) => variation?.image_url)?.image_url || null, [selectedVariations, variations]);
  const images = useMemo(() => variationImage ? [variationImage, ...baseImages.filter(i => i !== variationImage)] : baseImages, [baseImages, variationImage]);
  const inventoryState = getInventoryState(product ?? {});
  const inventoryStock = getInventoryStock(product ?? {});
  const quantityLimit = inventoryStock === null ? 99 : Math.max(1, inventoryStock);
  const inventoryLabel = inventoryState === 'sold_out'
    ? t.product.outOfStock
    : inventoryState === 'low'
      ? getInventoryLabel(inventoryState, inventoryStock ?? 0, language === 'es' ? 'es' : 'en')
      : t.product.inStock;
  const inventoryStatusClass = inventoryState === 'sold_out'
    ? 'text-destructive/90'
    : inventoryState === 'low'
      ? 'text-amber-400/90'
      : 'text-emerald-400/90';

  useEffect(() => {
    setQuantity((current) => Math.min(current, quantityLimit));
  }, [quantityLimit]);

  // When the user picks a variation that has its own image, jump to it.
  useEffect(() => {
    if (variationImage) setSelectedImage(0);
  }, [variationImage]);

  // ─── Dynamic SEO + OG meta ───
  useEffect(() => {
    if (!product) return;
    const name = language === 'es' ? product.name_es : product.name_en;
    const desc = (language === 'es' ? product.description_es : product.description_en) || `${name} · APERFY`;
    const img = baseImages[0] || '';
    const url = typeof window !== 'undefined' ? window.location.href : '';

    document.title = `${name} · APERFY`;

    const setMeta = (selector: string, attr: string, key: string, val: string) => {
      if (!val) return;
      let el = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
      el.setAttribute('content', val);
    };
    setMeta(`meta[name="description"]`, 'name', 'description', desc.slice(0, 158));
    setMeta(`meta[property="og:title"]`, 'property', 'og:title', name);
    setMeta(`meta[property="og:description"]`, 'property', 'og:description', desc.slice(0, 158));
    setMeta(`meta[property="og:type"]`, 'property', 'og:type', 'product');
    setMeta(`meta[property="og:url"]`, 'property', 'og:url', url);
    setMeta(`meta[property="og:image"]`, 'property', 'og:image', img);
    setMeta(`meta[name="twitter:card"]`, 'name', 'twitter:card', 'summary_large_image');
    setMeta(`meta[name="twitter:title"]`, 'name', 'twitter:title', name);
    setMeta(`meta[name="twitter:description"]`, 'name', 'twitter:description', desc.slice(0, 158));
    setMeta(`meta[name="twitter:image"]`, 'name', 'twitter:image', img);

    // JSON-LD Product
    const ldId = 'product-jsonld';
    let ld = document.getElementById(ldId) as HTMLScriptElement | null;
    if (!ld) { ld = document.createElement('script'); ld.id = ldId; ld.type = 'application/ld+json'; document.head.appendChild(ld); }
    ld.text = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Product',
      name, description: desc, image: baseImages, sku: product.slug, url,
      offers: {
        '@type': 'Offer',
        price: Number(product.base_price || 0),
        priceCurrency: 'USD',
        availability: inventoryState === 'sold_out' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      },
    });

    return () => { document.title = 'APERFY'; };
  }, [product, language, baseImages, inventoryState]);




  const handleAddToCart = useCallback(() => {
    if (!product) return;
    if (inventoryState === 'sold_out') {
      toast({ title: language === 'es' ? 'Producto agotado' : 'Product sold out', variant: 'destructive' });
      return;
    }
    addToCart({
      productId: product.id,
      productName: language === 'es' ? product.name_es : product.name_en,
      productImage: images[0] || '',
      slug: product.slug,
      quantity,
      unitPrice,
      selectedVariations: Object.entries(selectedVariations).map(([type, varId]) => {
        const v = variations.find((vr) => vr.id === varId);
        const eff = effectiveVarPrice(v);
        const isAbsoluteSize = type === 'size' && v && eff > 0;
        return { id: varId, type, name: v ? (language === 'es' ? v.name_es : v.name_en) : '', priceModifier: isAbsoluteSize ? 0 : eff };
      }),

      notes,
      weightGrams: selectedWeight && selectedWeight > 0 ? selectedWeight : undefined,
      dimensions: selectedDimensions || undefined,
    });
    toast({ title: language === 'es' ? 'Agregado al carrito' : 'Added to cart' });
  }, [product, language, images, quantity, unitPrice, selectedVariations, variations, notes, selectedWeight, selectedDimensions, addToCart, toast, inventoryState]);

  if (isLoading) {
    return (
      <div className="min-h-full bg-background">
        <Navbar />
        <div className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ProductDetailSkeleton />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-full bg-background">
        <Navbar />
        <div className="pt-24 text-center py-20">
          <Box className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">Product not found</p>
          <Link to="/"><Button variant="outline" className="mt-4 gap-2"><ArrowLeft className="w-4 h-4" />Back to Store</Button></Link>
        </div>
      </div>
    );
  }

  const specifications = filterEmptySpecifications([
    { k: 'Condition', v: product.condition_status === 'used' ? 'USED' : 'NEW' },
    { k: 'Category', v: product.categories ? (language === 'es' ? product.categories.name_es : product.categories.name_en) : null },
    { k: 'Weight', v: selectedWeight && selectedWeight > 0 ? `${selectedWeight}${t.product.grams}` : null },
    { k: 'Dimensions', v: selectedDimensions?.trim() ? `${selectedDimensions.trim()}mm` : null },
    {
      k: 'Variants',
      v: productMaterialsList.length > 0
        ? productMaterialsList.map((pm) => language === 'es' ? pm.materials?.name_es : pm.materials?.name_en).filter(Boolean).join(' · ')
        : null,
    },
    { k: 'Variations', v: variations.length > 0 ? `${variations.length} ${language === 'es' ? 'opciones' : 'options'}` : null },
    { k: 'SKU', v: `PRD-${product.id.slice(0, 8).toUpperCase()}` },
  ]);

  return (
    <div className="min-h-full bg-background">
      <Navbar />

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && images.length > 0 && (
          <ImageLightbox
            images={images}
            initialIndex={selectedImage}
            altText={language === 'es' ? product.name_es : product.name_en}
            language={language}
            onClose={closeLightbox}
          />
        )}
      </AnimatePresence>

      {/* ═══ Top Command Bar (sticky) ═══ */}
      <div data-product-command-bar className={productCommandBarClassName}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 text-[12px] text-muted-foreground">
            <Link to="/" className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors shrink-0">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.store.title}</span>
            </Link>
            <span className="text-border">/</span>
            {product.categories && (
              <>
                <span className="hidden md:inline truncate">{language === 'es' ? product.categories.name_es : product.categories.name_en}</span>
                <span className="hidden md:inline text-border">/</span>
              </>
            )}
            <span className="text-foreground truncate">{language === 'es' ? product.name_es : product.name_en}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden md:inline font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
              PRD-{product.id.slice(0, 6).toUpperCase()}
            </span>
            <div className="h-4 w-px bg-white/[0.06] hidden md:block" />
            <ShareMenu slug={product.slug} productName={language === 'es' ? product.name_es : product.name_en} size="md" />
            <button onClick={toggleFavorite} className="p-2 rounded-lg hover:bg-white/[0.04] transition-colors">
              <Heart className={`w-4 h-4 ${isFav ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="w-full min-w-0 pt-8 pb-[calc(10rem+env(safe-area-inset-bottom,0px))] lg:pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ═══ HERO GRID: thumb rail | hero | info rail ═══ */}
        <div className="grid min-w-0 xl:grid-cols-[72px_minmax(0,1fr)_360px] gap-6 xl:gap-8">

          {/* ─── Vertical Thumbnail Rail (desktop) ─── */}
          {images.length > 1 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              className="hidden xl:flex flex-col gap-2 sticky top-32 self-start max-h-[calc(100vh-10rem)] overflow-y-auto scrollbar-hide"
            >
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60 px-1 mb-1">
                {String(selectedImage + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
              </div>
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/[0.06] hover:border-primary/40 transition-colors group"
                >
                  {isProductVideo(img) ? <video src={img} aria-hidden muted playsInline preload="metadata" className={`w-full h-full object-contain bg-white p-0.5 transition-opacity ${i === selectedImage ? 'opacity-100' : 'opacity-50 group-hover:opacity-80'}`} /> : <img src={optimizeImageUrl(img, { width: 160, quality: 70 })} alt="" width={64} height={64} decoding="async" className={`w-full h-full object-contain bg-white p-0.5 transition-opacity ${i === selectedImage ? 'opacity-100' : 'opacity-50 group-hover:opacity-80'}`} />}
                  {i === selectedImage && (
                    <motion.span
                      layoutId="pdp-thumb-active"
                      className="absolute inset-0 rounded-lg ring-2 ring-primary pointer-events-none"
                      transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                    />
                  )}
                </button>
              ))}
            </motion.div>
          )}
          {/* Spacer when no thumbnails for grid alignment */}
          {images.length <= 1 && <div className="hidden xl:block" />}

          {/* ─── Hero Image ─── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="xl:sticky xl:top-32 xl:self-start"
          >
            <div
              className="aspect-square rounded-2xl overflow-hidden relative group border border-white/[0.06] bg-card/30 backdrop-blur-sm"
              style={{ boxShadow: '0 0 60px hsl(var(--primary) / 0.06), 0 30px 80px hsl(var(--background) / 0.5)' }}
            >
              {
                <div className="absolute inset-0 cursor-zoom-in" onClick={openLightbox}>
                  {/* Blurred background fill */}
                  {images.length > 0 && !isProductVideo(images[selectedImage]) && (
                    <img
                      src={optimizeImageUrl(images[selectedImage], { width: 960, quality: 72 })}
                      alt=""
                      aria-hidden
                      className="absolute inset-0 w-full h-full object-cover opacity-30 blur-2xl scale-110 pointer-events-none"
                    />
                  )}
                  <AnimatePresence mode="wait">
                    {images.length > 0 ? (
                      isProductVideo(images[selectedImage]) ? (
                        <motion.video
                          key={selectedImage}
                          src={images[selectedImage]}
                          aria-label={language === 'es' ? product.name_es : product.name_en}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="absolute inset-0 h-full w-full object-contain object-center p-2"
                          controls
                          muted
                          loop
                          autoPlay
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <motion.img
                          key={selectedImage}
                          src={optimizeImageUrl(images[selectedImage], { width: 1200, quality: 80 })}
                          srcSet={buildResponsiveImageSources(images[selectedImage], [640, 960, 1200], 80)}
                          sizes="(max-width: 1279px) calc(100vw - 2rem), min(62vw, 900px)"
                          alt={language === 'es' ? product.name_es : product.name_en}
                          width={1200}
                          height={1200}
                          loading={selectedImage === 0 ? 'eager' : 'lazy'}
                          decoding="async"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="absolute inset-0 h-full w-full object-contain object-center p-2 transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Box className="w-24 h-24 text-muted-foreground/20" />
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              }

              {/* Counter chip */}
              {images.length > 1 && (
                <div className="absolute bottom-4 left-4 px-2.5 py-1 rounded-md bg-background/70 backdrop-blur-md border border-white/[0.06] font-mono text-[10px] tabular-nums uppercase tracking-[0.15em] text-foreground/80">
                  {String(selectedImage + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
                </div>
              )}

              {/* Zoom hint */}
              {images.length > 0 && (
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-background/70 backdrop-blur-md border border-white/[0.06] rounded-md px-2.5 py-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-foreground/80 pointer-events-none">
                  <Maximize2 className="w-3 h-3 text-primary" />
                  Zoom
                </div>
              )}

              {/* Arrow nav */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedImage((selectedImage - 1 + images.length) % images.length); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/60 backdrop-blur-md border border-white/[0.06] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-background/80 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedImage((selectedImage + 1) % images.length); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/60 backdrop-blur-md border border-white/[0.06] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-background/80 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Mobile horizontal thumbnails */}
            {images.length > 1 && (
              <div className="flex xl:hidden gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`relative w-16 h-16 rounded-lg overflow-hidden border shrink-0 transition-all ${
                      i === selectedImage ? 'border-primary' : 'border-white/[0.06] opacity-60'
                    }`}
                  >
                    {isProductVideo(img) ? <video src={img} aria-hidden muted playsInline preload="metadata" className="w-full h-full object-contain bg-white p-0.5" /> : <img src={optimizeImageUrl(img, { width: 160, quality: 70 })} alt="" width={64} height={64} decoding="async" className="w-full h-full object-contain bg-white p-0.5" />}
                  </button>
                ))}
              </div>
            )}
            {product.model_3d_url && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-card/30 p-2">
                <div className="mb-2 px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                  {language === 'es' ? 'Vista 3D' : '3D view'}
                </div>
                <div className="aspect-square">
                  <Model3DViewer
                    src={product.model_3d_url}
                    poster={images[0] ? optimizeImageUrl(images[0], { width: 800, quality: 72 }) : undefined}
                    alt={language === 'es' ? product.name_es : product.name_en}
                    className="h-full w-full"
                  />
                </div>
              </div>
            )}
          </motion.div>

          {/* ─── Right Info Rail (sticky, decision-only) ─── */}
          <div className="xl:sticky xl:top-32 xl:self-start space-y-5">
            {/* Identity */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {product.categories && (
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary/80">
                    {language === 'es' ? product.categories.name_es : product.categories.name_en}
                  </div>
                )}
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold tracking-wide ${product.condition_status === 'used' ? 'bg-amber-400/15 text-amber-300' : 'bg-primary/15 text-primary'}`}>
                  {product.condition_status === 'used' ? 'USED' : 'NEW'}
                </span>
              </div>
              <h1 className="font-display font-bold text-[2rem] lg:text-[2.25rem] text-foreground leading-[1.05] tracking-[-0.02em]">
                {language === 'es' ? product.name_es : product.name_en}
              </h1>

              {/* Price + status row, Apple-clean */}
              <div className="flex items-center justify-between mt-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={totalPrice.toFixed(2)}
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 30 }}
                    className="flex items-baseline gap-1"
                  >
                    <span className="text-[28px] font-semibold text-foreground tabular-nums tracking-tight">
                      ${totalPrice.toFixed(2)}
                    </span>
                    {quantity > 1 && (
                      <span className="font-mono text-[11px] text-muted-foreground tabular-nums ml-1">
                        ×{String(quantity).padStart(2, '0')}
                      </span>
                    )}
                  </motion.div>
                </AnimatePresence>
                <div className="flex items-center gap-2">
                  <LikeButton productId={product.id} size="md" />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.2em] ${inventoryStatusClass}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${inventoryState === 'sold_out' ? 'bg-destructive' : inventoryState === 'low' ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                  {inventoryLabel}
                </span>
                <span className="text-border">·</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {language === 'es' ? 'Envío 3–7 días' : 'Ships in 3–7 days'}
                </span>
              </div>
            </motion.div>

            {/* Configurator card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="rounded-2xl border border-white/[0.06] bg-card/40 backdrop-blur-xl p-5 space-y-5"
            >
              {/* Variations OR Standard fallback — Amazon-style "Label: Value" header */}
              {Object.entries(variationsByType).length > 0 ? (
                (Object.entries(variationsByType) as [string, Variation[]][]).map(([type, vars], idx) => {
                  const selectedVar = vars.find((variation) => variation.id === selectedVariations[type]);
                  const typeLabel = type === 'color'
                    ? t.product.color
                    : type === 'size'
                      ? t.product.size
                      : type.charAt(0).toUpperCase() + type.slice(1);
                  const selectedLabel = selectedVar
                    ? (language === 'es' ? selectedVar.name_es : selectedVar.name_en)
                    : (language === 'es' ? 'Elegir' : 'Choose');
                  return (
                    <motion.div
                      key={type}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 + idx * 0.04 }}
                    >
                      <div className="mb-2.5 text-[14px]">
                        <span className="text-muted-foreground">{typeLabel}:</span>{' '}
                        <span className="text-foreground font-semibold">{selectedLabel}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {vars.map((v) => {
                          const isSize = type === 'size';
                          const vEff = effectiveVarPrice(v);
                          const vPrice = isSize && vEff > 0 ? vEff : null;
                          const vWeight = isSize && v.weight_grams ? Number(v.weight_grams) : null;
                          const isSelected = selectedVariations[type] === v.id;
                          return (
                            <motion.button
                              key={v.id}
                              onClick={() => setSelectedVariations(prev => ({ ...prev, [type]: v.id }))}
                              whileTap={{ scale: 0.97 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                              className={`relative flex flex-col items-start gap-0.5 px-3 py-2 rounded-lg border text-[13px] transition-colors ${
                                isSelected
                                  ? 'border-primary/60 bg-primary/[0.08] text-foreground'
                                  : 'border-white/[0.06] bg-white/[0.02] text-foreground/80 hover:border-primary/30'
                              }`}
                            >
                              {isSelected && (
                                <motion.span
                                  layoutId={`var-${type}-ring`}
                                  className="absolute inset-0 rounded-lg ring-1 ring-primary pointer-events-none"
                                  transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                                />
                              )}
                              <div className="flex items-center gap-1.5">
                                {type === 'color' && (
                                  <span className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: v.value }} />
                                )}
                                {v.image_url && (
                                  <span className="w-5 h-5 rounded overflow-hidden border border-white/10 shrink-0">
                                    <img src={optimizeImageUrl(v.image_url, { width: 160, quality: 70 })} alt="" width={64} height={64} decoding="async" className="w-full h-full object-cover" />
                                  </span>
                                )}
                                <span className="font-medium">{language === 'es' ? v.name_es : v.name_en}</span>
                              </div>
                              {isSize && (vWeight || v.dimensions || vPrice) && (
                                <span className="text-[9px] text-muted-foreground font-mono tabular-nums">
                                  {[vWeight && `${vWeight}g`, v.dimensions && `${v.dimensions}mm`, vPrice && `$${vPrice.toFixed(2)}`].filter(Boolean).join(' · ')}
                                </span>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div>
                  <div className="mb-2.5 text-[14px]">
                    <span className="text-muted-foreground">{language === 'es' ? 'Edición' : 'Edition'}:</span>{' '}
                    <span className="text-foreground font-semibold">{language === 'es' ? 'Estándar' : 'Standard'}</span>
                  </div>
                  <div className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/60 bg-primary/[0.08] text-foreground text-[13px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="font-medium">{language === 'es' ? 'Estándar' : 'Standard'}</span>
                    <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                      {language === 'es' ? 'Única opción' : 'Default'}
                    </span>
                  </div>

                </div>
              )}

              {/* Quantity */}
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2.5">{t.product.quantity}</div>
                <div className="inline-flex items-center gap-1 rounded-full bg-white/[0.03] border border-white/[0.06] p-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-full hover:bg-white/[0.05] flex items-center justify-center transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={quantity}
                      initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 3 }}
                      transition={{ duration: 0.15 }}
                      className="font-mono font-semibold text-sm w-9 text-center tabular-nums"
                    >
                      {String(quantity).padStart(2, '0')}
                    </motion.span>
                  </AnimatePresence>
                  <button
                    onClick={() => setQuantity(Math.min(quantityLimit, quantity + 1))}
                    disabled={quantity >= quantityLimit || inventoryState === 'sold_out'}
                    className="w-8 h-8 rounded-full hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="hidden lg:block">
              <motion.div whileTap={{ scale: 0.99 }}>
                <Button
                  onClick={handleAddToCart}
                  disabled={inventoryState === 'sold_out'}
                  className="w-full bg-gradient-gold text-primary-foreground font-bold gap-2 h-12 text-[14px] shadow-[0_0_30px_hsl(var(--primary)/0.25)] hover:shadow-[0_0_50px_hsl(var(--primary)/0.5)] transition-all rounded-full tracking-tight"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{t.product.addToCart}</span>
                  <span className="opacity-60">·</span>
                  <span className="tabular-nums">${totalPrice.toFixed(2)}</span>
                </Button>
              </motion.div>
              <p className="text-center text-[10px] text-muted-foreground mt-2.5 font-mono uppercase tracking-wider">
                <Lock className="inline w-2.5 h-2.5 mr-1 -mt-0.5" /> Secure checkout
              </p>
            </motion.div>
          </div>
        </div>

        {/* (Top spec strip removed — specs live in the lower Specifications panel) */}

        {/* ═══ Overview + Details ═══ */}
        <div className="mt-12 xl:mt-16 grid min-w-0 xl:grid-cols-[minmax(0,1fr)_400px] gap-10 xl:gap-16">
          {/* Overview */}
          <motion.section
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary/80 mb-4">Overview</div>
            <h2 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-foreground mb-5">
              {language === 'es' ? 'Acerca de este producto' : 'About this product'}
            </h2>
            <p className="text-muted-foreground leading-relaxed text-[15px] whitespace-pre-wrap">
              {language === 'es' ? product.description_es : product.description_en}
            </p>

            {/* Notes input */}
            <div className="mt-8">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">{t.product.specialNotes}</div>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.product.specialNotesPlaceholder}
                className="bg-white/[0.02] border-white/[0.06] rounded-xl focus-visible:ring-primary/30"
                rows={3}
              />
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <GlassSection className="p-4" delay={0.05}>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/80">{language === 'es' ? 'Vendido por' : 'Sold by'}</div>
                <p className="mt-2 font-semibold">{product.seller_name || 'APERFY'}</p>
              </GlassSection>
              <GlassSection className="p-4" delay={0.1}>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/80">{language === 'es' ? 'Devoluciones' : 'Returns'}</div>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">{language === 'es' ? (product.return_policy_es || 'Devoluciones de 30 días para artículos elegibles.') : (product.return_policy_en || '30-day returns for eligible items.')}</p>
              </GlassSection>
            </div>
          </motion.section>

          {/* Key/Value details */}
          <motion.aside
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="rounded-2xl border border-white/[0.06] bg-card/30 backdrop-blur-xl p-6 h-fit"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary/80 mb-5">Specifications</div>
            <dl className="divide-y divide-white/[0.05]">
              {specifications.map((row, i) => (
                <div key={row.k} className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground shrink-0">{row.k}</dt>
                  <dd className="font-mono text-[12px] text-foreground text-right truncate">{row.v}</dd>
                </div>
              ))}
            </dl>
          </motion.aside>
        </div>

        {/* Divider */}
        <div className="mt-16 mb-12 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

        {/* Reviews */}
        <ProductReviews productId={product.id} />

        {/* Related Products (horizontal scroll-snap) */}
        {relatedProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="mt-20"
          >
            <div className="flex items-baseline justify-between mb-6">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary/80 mb-1">Related</div>
                <h2 className="font-display font-bold text-2xl tracking-tight">{t.product.relatedProducts}</h2>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">
                {String(relatedProducts.length).padStart(2, '0')} {language === 'es' ? 'productos' : 'products'}
              </span>
            </div>
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide -mx-4 px-4 lg:-mx-0 lg:px-0">
              {relatedProducts.map((rp, i) => (
                <div key={rp.id} className="snap-start shrink-0 w-[260px] lg:w-[280px]">
                  <ProductCard product={rp} index={i} showBadges />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>


      {/* ═══ Mobile premium sticky Add-to-Cart dock ═══ */}
      <MobileStickyAddToCart
        image={images[selectedImage] || images[0] || null}
        variationLabel={
          Object.entries(selectedVariations)
            .map(([, varId]) => {
              const v = variations.find((vr) => vr.id === varId);
              return v ? (language === 'es' ? v.name_es : v.name_en) : null;
            })
            .filter(Boolean)
            .join(' · ') || null
        }
        unitPrice={unitPrice}
        totalPrice={totalPrice}
        quantity={quantity}
        setQuantity={setQuantity}
        needsVariation={
          Object.keys(variationsByType).length > 0 &&
          Object.keys(variationsByType).some((type) => !selectedVariations[type])
        }
        onAdd={handleAddToCart}
        productName={language === 'es' ? product.name_es : product.name_en}
        inStock={inventoryState !== 'sold_out'}
      />


      <Footer />
    </div>
  );
}
