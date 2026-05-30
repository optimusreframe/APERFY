import { useState, useEffect, useCallback } from 'react';
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

// ─── Lightbox Component ───
function ImageLightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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
  }, [images.length, onClose]);

  const resetZoom = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.5, Math.min(5, z - e.deltaY * 0.002)));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handlePointerUp = () => setIsDragging(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Top controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(5, z + 0.5))} className="bg-card/50 backdrop-blur border border-border/30 text-foreground hover:bg-card">
          <ZoomIn className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.5))} className="bg-card/50 backdrop-blur border border-border/30 text-foreground hover:bg-card">
          <ZoomOut className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={resetZoom} className="bg-card/50 backdrop-blur border border-border/30 text-foreground hover:bg-card">
          <RotateCcw className="w-5 h-5" />
        </Button>
        <div className="px-3 py-1.5 bg-card/50 backdrop-blur border border-border/30 rounded-md text-sm text-muted-foreground">
          {Math.round(zoom * 100)}%
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="bg-card/50 backdrop-blur border border-border/30 text-foreground hover:bg-card">
          <X className="w-5 h-5" />
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
        className="flex-1 w-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <img
          src={images[index]}
          alt=""
          className="max-w-[90vw] max-h-[80vh] object-contain select-none"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          }}
          draggable={false}
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-card/60 backdrop-blur-lg rounded-xl border border-border/30">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => { setIndex(i); resetZoom(); }}
              className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${i === index ? 'border-primary shadow-[0_0_12px_hsl(var(--primary)/0.4)]' : 'border-transparent opacity-60 hover:opacity-100'}`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
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
    <div className="grid lg:grid-cols-2 gap-10">
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
      return data;
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
      return data;
    },
    enabled: !!product?.id,
  });

  const { data: relatedProducts = [] } = useQuery({
    queryKey: ['related-products', product?.category_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name_en, name_es)')
        .eq('is_active', true)
        .eq('category_id', product!.category_id!)
        .neq('id', product!.id)
        .limit(4);
      if (error) throw error;
      return data;
    },
    enabled: !!product?.category_id,
  });

  const { data: favorites = [], refetch: refetchFavorites } = useQuery({
    queryKey: ['user-favorites-detail', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from('favorites').select('product_id').eq('user_id', user.id);
      if (error) throw error;
      return data.map((f: any) => f.product_id);
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

  const variationsByType = variations.reduce((acc: Record<string, any[]>, v: any) => {
    if (!acc[v.type]) acc[v.type] = [];
    acc[v.type].push(v);
    return acc;
  }, {});

  const selectedSizeVar = variations.find((v: any) => v.type === 'size' && v.id === selectedVariations['size']);

  // Effective price per variation: if use_manual_price + price_override present, use that.
  const effectiveVarPrice = (v: any): number => {
    if (!v) return 0;
    if (v.use_manual_price && v.price_override !== null && v.price_override !== undefined) {
      return Number(v.price_override);
    }
    return Number(v.price_modifier) || 0;
  };

  const priceModifier = Object.values(selectedVariations).reduce((sum, varId) => {
    const v = variations.find((vr: any) => vr.id === varId);
    return sum + effectiveVarPrice(v);
  }, 0);

  const selectedSizeEffective = effectiveVarPrice(selectedSizeVar);
  const unitPrice = selectedSizeVar && selectedSizeEffective > 0
    ? selectedSizeEffective
    : Number(product?.base_price || 0) + priceModifier;
  const totalPrice = product ? unitPrice * quantity : 0;
  const selectedWeight = selectedSizeVar ? Number(selectedSizeVar.weight_grams || 0) : null;
  const selectedDimensions = selectedSizeVar ? (selectedSizeVar as any).dimensions : null;
  const baseImages = product ? (product.images as string[]) || [] : [];

  // If any selected variation has an image_url, show it as the hero image (override)
  const variationImage = Object.values(selectedVariations)
    .map(varId => variations.find((vr: any) => vr.id === varId))
    .find((v: any) => v?.image_url)?.image_url || null;
  const images = variationImage ? [variationImage, ...baseImages.filter(i => i !== variationImage)] : baseImages;

  // When the user picks a variation that has its own image, jump to it.
  useEffect(() => {
    if (variationImage) setSelectedImage(0);
  }, [variationImage]);



  const handleAddToCart = useCallback(() => {
    if (!product) return;
    addToCart({
      productId: product.id,
      productName: language === 'es' ? product.name_es : product.name_en,
      productImage: images[0] || '',
      slug: product.slug,
      quantity,
      unitPrice,
      selectedVariations: Object.entries(selectedVariations).map(([type, varId]) => {
        const v = variations.find((vr: any) => vr.id === varId);
        const isAbsoluteSize = type === 'size' && v && Number(v.price_modifier) > 0;
        return { id: varId, type, name: v ? (language === 'es' ? v.name_es : v.name_en) : '', priceModifier: isAbsoluteSize ? 0 : (v ? Number(v.price_modifier) : 0) };
      }),
      notes,
      weightGrams: selectedWeight && selectedWeight > 0 ? selectedWeight : undefined,
      dimensions: selectedDimensions || undefined,
    });
    toast({ title: language === 'es' ? 'Agregado al carrito' : 'Added to cart' });
  }, [product, language, images, quantity, unitPrice, selectedVariations, variations, notes, selectedWeight, selectedDimensions, addToCart, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ProductDetailSkeleton />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 text-center py-20">
          <Box className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">Product not found</p>
          <Link to="/"><Button variant="outline" className="mt-4 gap-2"><ArrowLeft className="w-4 h-4" />Back to Store</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && images.length > 0 && (
          <ImageLightbox
            images={images}
            initialIndex={selectedImage}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ═══ Top Command Bar (sticky) ═══ */}
      <div className="sticky top-16 z-30 border-b border-white/[0.05] bg-background/80 backdrop-blur-xl">
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

      <div className="pt-8 pb-24 lg:pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ═══ HERO GRID: thumb rail | hero | info rail ═══ */}
        <div className="grid lg:grid-cols-[72px_minmax(0,1fr)_360px] gap-6 lg:gap-8">

          {/* ─── Vertical Thumbnail Rail (desktop) ─── */}
          {images.length > 1 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              className="hidden lg:flex flex-col gap-2 sticky top-32 self-start max-h-[calc(100vh-10rem)] overflow-y-auto scrollbar-hide"
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
                  <img src={img} alt="" className={`w-full h-full object-cover transition-opacity ${i === selectedImage ? 'opacity-100' : 'opacity-50 group-hover:opacity-80'}`} />
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
          {images.length <= 1 && <div className="hidden lg:block" />}

          {/* ─── Hero Image ─── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="lg:sticky lg:top-32 lg:self-start"
          >
            <div
              className="aspect-square rounded-2xl overflow-hidden relative cursor-zoom-in group border border-white/[0.06] bg-card/30 backdrop-blur-sm"
              style={{ boxShadow: '0 0 60px hsl(var(--primary) / 0.06), 0 30px 80px hsl(var(--background) / 0.5)' }}
              onClick={() => setLightboxOpen(true)}
            >
              <AnimatePresence mode="wait">
                {images.length > 0 ? (
                  <motion.img
                    key={selectedImage}
                    src={images[selectedImage]}
                    alt={language === 'es' ? product.name_es : product.name_en}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Box className="w-24 h-24 text-muted-foreground/20" />
                  </div>
                )}
              </AnimatePresence>

              {/* Counter chip */}
              {images.length > 1 && (
                <div className="absolute bottom-4 left-4 px-2.5 py-1 rounded-md bg-background/70 backdrop-blur-md border border-white/[0.06] font-mono text-[10px] tabular-nums uppercase tracking-[0.15em] text-foreground/80">
                  {String(selectedImage + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
                </div>
              )}

              {/* Zoom hint */}
              {images.length > 0 && (
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-background/70 backdrop-blur-md border border-white/[0.06] rounded-md px-2.5 py-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-foreground/80">
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
              <div className="flex lg:hidden gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`relative w-16 h-16 rounded-lg overflow-hidden border shrink-0 transition-all ${
                      i === selectedImage ? 'border-primary' : 'border-white/[0.06] opacity-60'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* ─── Right Info Rail (sticky, decision-only) ─── */}
          <div className="lg:sticky lg:top-32 lg:self-start space-y-5">
            {/* Identity */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              {product.categories && (
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary/80 mb-2">
                  {language === 'es' ? product.categories.name_es : product.categories.name_en}
                </div>
              )}
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
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-400/90">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {t.product.inStock}
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
              <div className="flex items-center justify-between">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary/80">
                  {language === 'es' ? 'Configurar' : 'Configure'}
                </div>
                {Object.keys(variationsByType).length === 0 && (
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                    {language === 'es' ? 'Edición única' : 'Single edition'}
                  </span>
                )}
              </div>

              {/* Variations OR Standard fallback */}
              {Object.entries(variationsByType).length > 0 ? (
                Object.entries(variationsByType).map(([type, vars], idx) => (
                  <motion.div
                    key={type}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 + idx * 0.04 }}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        {type === 'color' ? t.product.color : type === 'size' ? t.product.size : type}
                      </div>
                      {selectedVariations[type] && (
                        <span className="font-mono text-[10px] text-primary uppercase tracking-wider">
                          {language === 'es' ? 'Seleccionado' : 'Selected'}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(vars as any[]).map((v: any) => {
                        const isSize = type === 'size';
                        const vPrice = isSize && Number(v.price_modifier) > 0 ? Number(v.price_modifier) : null;
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
                ))
              ) : (
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2.5">
                    {language === 'es' ? 'Versión' : 'Edition'}
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
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 rounded-full hover:bg-white/[0.05] flex items-center justify-center transition-colors"
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
        <div className="mt-12 lg:mt-16 grid lg:grid-cols-[1fr_400px] gap-10 lg:gap-16">
          {/* Overview */}
          <motion.section
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary/80 mb-4">Overview</div>
            <h2 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-foreground mb-5">
              {language === 'es' ? 'Acerca de este modelo' : 'About this model'}
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
          </motion.section>

          {/* Key/Value details */}
          <motion.aside
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="rounded-2xl border border-white/[0.06] bg-card/30 backdrop-blur-xl p-6 h-fit"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary/80 mb-5">Specifications</div>
            <dl className="divide-y divide-white/[0.05]">
              {[
                { k: 'Category', v: product.categories ? (language === 'es' ? product.categories.name_es : product.categories.name_en) : '—' },
                { k: 'Weight', v: selectedWeight ? `${selectedWeight}${t.product.grams}` : '—' },
                { k: 'Dimensions', v: selectedDimensions ? `${selectedDimensions}mm` : '—' },
                { k: 'Materials', v: productMaterialsList.length > 0 ? productMaterialsList.map((pm: any) => language === 'es' ? pm.materials.name_es : pm.materials.name_en).join(' · ') : '—' },
                { k: 'Variations', v: variations.length > 0 ? `${variations.length} ${language === 'es' ? 'opciones' : 'options'}` : '—' },
                { k: 'SKU', v: `PRD-${product.id.slice(0, 8).toUpperCase()}` },
              ].map((row, i) => (
                <div key={i} className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0">
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
                <h2 className="font-display font-bold text-2xl tracking-tight">{t.product.relatedModels}</h2>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">
                {String(relatedProducts.length).padStart(2, '0')} {language === 'es' ? 'modelos' : 'models'}
              </span>
            </div>
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide -mx-4 px-4 lg:-mx-0 lg:px-0">
              {relatedProducts.map((rp: any, i: number) => (
                <div key={rp.id} className="snap-start shrink-0 w-[260px] lg:w-[280px]">
                  <ProductCard product={rp} index={i} showBadges={false} />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>


      {/* ═══ Mobile Floating Action Bar ═══ */}
      <motion.div
        initial={{ y: 100 }} animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30, delay: 0.3 }}
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      >
        <div className="bg-card/85 backdrop-blur-2xl border-t border-white/[0.08] px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Total</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-gradient-gold tabular-nums">${totalPrice.toFixed(2)}</span>
              <span className="font-mono text-[10px] text-muted-foreground tabular-nums">×{String(quantity).padStart(2, '0')}</span>
            </div>
          </div>
          <Button
            onClick={handleAddToCart}
            className="bg-gradient-gold text-primary-foreground font-bold gap-2 h-12 px-6 shadow-[0_0_20px_hsl(var(--primary)/0.3)] rounded-full tracking-tight"
          >
            <ShoppingCart className="w-5 h-5" />
            {t.product.addToCart}
          </Button>
        </div>
      </motion.div>


      <Footer />
    </div>
  );
}
