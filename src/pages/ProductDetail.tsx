import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingCart, Box, ArrowLeft, Minus, Plus, ZoomIn, ZoomOut, X, Weight, Ruler, ChevronLeft, ChevronRight, RotateCcw, Maximize2 } from 'lucide-react';
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
  const priceModifier = Object.values(selectedVariations).reduce((sum, varId) => {
    const v = variations.find((vr: any) => vr.id === varId);
    return sum + (v ? Number(v.price_modifier) : 0);
  }, 0);

  const unitPrice = selectedSizeVar && Number(selectedSizeVar.price_modifier) > 0
    ? Number(selectedSizeVar.price_modifier)
    : Number(product?.base_price || 0) + priceModifier;
  const totalPrice = product ? unitPrice * quantity : 0;
  const selectedWeight = selectedSizeVar ? Number(selectedSizeVar.weight_grams || 0) : null;
  const selectedDimensions = selectedSizeVar ? (selectedSizeVar as any).dimensions : null;
  const images = product ? (product.images as string[]) || [] : [];

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

      <div className="pt-24 pb-24 lg:pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link to="/" className="hover:text-primary transition-colors">{t.store.title}</Link>
          <span className="text-border">/</span>
          {product.categories && (
            <>
              <span>{language === 'es' ? product.categories.name_es : product.categories.name_en}</span>
              <span className="text-border">/</span>
            </>
          )}
          <span className="text-foreground truncate">{language === 'es' ? product.name_es : product.name_en}</span>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_1fr] gap-8 lg:gap-12">
          {/* ═══ Image Gallery ═══ */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:sticky lg:top-24 lg:self-start">
            <div
              className="aspect-square rounded-2xl overflow-hidden relative cursor-pointer group border border-border/20 bg-card/30 backdrop-blur-sm"
              style={{ boxShadow: '0 0 40px hsl(var(--primary) / 0.08), 0 20px 60px hsl(var(--background) / 0.5)' }}
              onClick={() => setLightboxOpen(true)}
            >
              {images.length > 0 ? (
                <img
                  src={images[selectedImage]}
                  alt={language === 'es' ? product.name_es : product.name_en}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Box className="w-24 h-24 text-muted-foreground/20" />
                </div>
              )}
              {/* Hover overlay */}
              {images.length > 0 && (
                <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-all duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-card/80 backdrop-blur-lg border border-border/30 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm text-foreground shadow-xl">
                    <Maximize2 className="w-4 h-4 text-primary" />
                    {language === 'es' ? 'Clic para ampliar' : 'Click to enlarge'}
                  </div>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2.5 mt-4 overflow-x-auto scrollbar-hide pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all duration-300 ${
                      i === selectedImage
                        ? 'border-primary shadow-[0_0_16px_hsl(var(--primary)/0.35)] scale-105'
                        : 'border-border/30 hover:border-primary/40 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* ═══ Product Info ═══ */}
          <div className="space-y-6">
            {/* ─── Identity ─── */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  {product.categories && (
                    <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary/80 mb-2">
                      {language === 'es' ? product.categories.name_es : product.categories.name_en}
                    </div>
                  )}
                  <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-foreground leading-[1.05] tracking-tight">
                    {language === 'es' ? product.name_es : product.name_en}
                  </h1>
                </div>
                <div className="flex items-center gap-1 shrink-0 pt-1">
                  <ShareMenu slug={product.slug} productName={language === 'es' ? product.name_es : product.name_en} size="md" />
                  <button onClick={toggleFavorite} className="p-2.5 rounded-xl hover:bg-primary/10 transition-all border border-transparent hover:border-primary/20">
                    <Heart className={`w-5 h-5 ${isFav ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                  </button>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-4 mt-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={totalPrice.toFixed(2)}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                    className="flex items-baseline gap-1"
                  >
                    <span className="text-2xl font-semibold text-gradient-gold tabular-nums">$</span>
                    <span className="text-5xl sm:text-6xl font-black text-gradient-gold tabular-nums tracking-tight leading-none">
                      {Math.floor(totalPrice)}
                    </span>
                    <span className="text-2xl font-semibold text-gradient-gold tabular-nums">
                      .{totalPrice.toFixed(2).split('.')[1]}
                    </span>
                  </motion.div>
                </AnimatePresence>
                <LikeButton productId={product.id} size="md" />
              </div>

              {/* Status badge */}
              <div className="flex items-center gap-2 mt-3">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  {t.product.inStock}
                </span>
              </div>
            </motion.div>

            {/* ─── Palantir tech spec strip ─── */}
            {(selectedWeight || selectedDimensions || productMaterialsList.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="grid grid-cols-3 rounded-2xl border border-white/[0.06] bg-card/30 backdrop-blur-xl divide-x divide-white/[0.05] overflow-hidden"
              >
                <div className="px-4 py-3.5">
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Weight</div>
                  <div className="font-mono text-sm font-semibold tabular-nums text-foreground">
                    {selectedWeight ? `${selectedWeight}g` : '—'}
                  </div>
                </div>
                <div className="px-4 py-3.5">
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Size</div>
                  <div className="font-mono text-sm font-semibold tabular-nums text-foreground truncate">
                    {selectedDimensions ? `${selectedDimensions}mm` : '—'}
                  </div>
                </div>
                <div className="px-4 py-3.5">
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Material</div>
                  <div className="font-mono text-sm font-semibold text-foreground truncate">
                    {productMaterialsList.length > 0 ? (language === 'es' ? productMaterialsList[0].materials.name_es : productMaterialsList[0].materials.name_en) : '—'}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── Description ─── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Overview</div>
              <p className="text-muted-foreground leading-relaxed text-[15px]">
                {language === 'es' ? product.description_es : product.description_en}
              </p>
            </motion.div>

            {/* ─── Materials (multi) ─── */}
            {productMaterialsList.length > 1 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">{t.product.material}</div>
                <div className="flex flex-wrap gap-2">
                  {productMaterialsList.map((pm: any) => (
                    <span key={pm.id} className="px-3 py-1.5 rounded-lg bg-white/[0.03] text-[13px] text-foreground border border-white/[0.06] font-mono">
                      {language === 'es' ? pm.materials.name_es : pm.materials.name_en}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ─── Variations (Apple segmented controls) ─── */}
            {Object.entries(variationsByType).map(([type, vars], idx) => (
              <motion.div
                key={type}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + idx * 0.05 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {type === 'color' ? t.product.color : type === 'size' ? t.product.size : type}
                  </div>
                  {selectedVariations[type] && (
                    <span className="font-mono text-[10px] text-primary uppercase tracking-wider">Selected</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
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
                        className={`relative flex flex-col items-start gap-1 px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                          isSelected
                            ? 'border-primary/60 bg-primary/[0.08] text-foreground'
                            : 'border-white/[0.06] bg-white/[0.02] text-foreground/80 hover:border-primary/30 hover:bg-white/[0.04]'
                        }`}
                      >
                        {isSelected && (
                          <motion.span
                            layoutId={`var-${type}-ring`}
                            className="absolute inset-0 rounded-xl ring-1 ring-primary pointer-events-none"
                            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                          />
                        )}
                        <div className="flex items-center gap-2">
                          {type === 'color' && (
                            <span className="w-4 h-4 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: v.value }} />
                          )}
                          <span className="font-medium">{language === 'es' ? v.name_es : v.name_en}</span>
                        </div>
                        {isSize && (vWeight || vPrice || v.dimensions) && (
                          <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                            {vWeight ? `${vWeight}g` : ''}
                            {vWeight && v.dimensions ? ' · ' : ''}
                            {v.dimensions ? `${v.dimensions}mm` : ''}
                            {(vWeight || v.dimensions) && vPrice ? ' · ' : ''}
                            {vPrice ? `$${vPrice.toFixed(2)}` : ''}
                          </span>
                        )}
                        {!isSize && Number(v.price_modifier) > 0 && (
                          <span className="text-[10px] text-muted-foreground font-mono tabular-nums">+${Number(v.price_modifier).toFixed(2)}</span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            ))}

            {/* ─── Quantity (Apple stepper) ─── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">{t.product.quantity}</div>
              <div className="inline-flex items-center gap-1 rounded-full bg-white/[0.03] border border-white/[0.06] p-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-9 h-9 rounded-full hover:bg-white/[0.05] flex items-center justify-center transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={quantity}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="font-mono font-semibold text-base w-10 text-center tabular-nums"
                  >
                    {String(quantity).padStart(2, '0')}
                  </motion.span>
                </AnimatePresence>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-9 h-9 rounded-full hover:bg-white/[0.05] flex items-center justify-center transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>

            {/* ─── Notes ─── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">{t.product.specialNotes}</div>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.product.specialNotesPlaceholder}
                className="bg-white/[0.02] border-white/[0.06] rounded-xl focus-visible:ring-primary/30"
                rows={3}
              />
            </motion.div>

            {/* ─── Desktop Add to Cart ─── */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="hidden lg:block pt-2">
              <motion.div whileTap={{ scale: 0.99 }}>
                <Button
                  onClick={handleAddToCart}
                  className="w-full bg-gradient-gold text-primary-foreground font-bold gap-3 h-14 text-[15px] shadow-[0_0_30px_hsl(var(--primary)/0.25)] hover:shadow-[0_0_50px_hsl(var(--primary)/0.5)] transition-all duration-300 rounded-full tracking-tight"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>{t.product.addToCart}</span>
                  <span className="font-mono tabular-nums opacity-80">·</span>
                  <span className="tabular-nums">${totalPrice.toFixed(2)}</span>
                </Button>
              </motion.div>
              <p className="text-center text-[11px] text-muted-foreground mt-3 font-mono uppercase tracking-wider">
                <Lock className="inline w-3 h-3 mr-1 -mt-0.5" /> Secure checkout · Free shipping over $50
              </p>
            </motion.div>
          </div>

        </div>

        {/* Divider */}
        <div className="mt-16 mb-12 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />

        {/* Reviews Section */}
        <ProductReviews productId={product.id} />

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-16">
            <h2 className="font-display font-bold text-xl sm:text-2xl mb-6">{t.product.relatedModels}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {relatedProducts.map((rp: any, i: number) => (
                <ProductCard key={rp.id} product={rp} index={i} showBadges={false} />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* ═══ Mobile Floating Action Bar ═══ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        <div className="bg-card/80 backdrop-blur-xl border-t border-border/30 px-4 py-3 flex items-center gap-4">
          <div className="flex-1">
            <span className="text-2xl font-black text-gradient-gold">${totalPrice.toFixed(2)}</span>
            <span className="text-xs text-muted-foreground ml-2">x{quantity}</span>
          </div>
          <Button
            onClick={handleAddToCart}
            className="bg-gradient-gold text-primary-foreground font-bold gap-2 h-12 px-6 shadow-[0_0_20px_hsl(var(--primary)/0.3)] rounded-xl"
          >
            <ShoppingCart className="w-5 h-5" />
            {t.product.addToCart}
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
