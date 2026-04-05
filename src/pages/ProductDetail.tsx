import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Box, ArrowLeft, Minus, Plus, ZoomIn, Weight, Ruler } from 'lucide-react';
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

function ProductDetailSkeleton() {
  return (
    <div className="grid lg:grid-cols-2 gap-10">
      <div>
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="flex gap-2 mt-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-16 h-16 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="space-y-6">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-5 w-1/4" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

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
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isZooming, setIsZooming] = useState(false);

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

  // Calculate price: if a "size" variation is selected, use its price_modifier as absolute price
  const selectedSizeVar = variations.find((v: any) => v.type === 'size' && v.id === selectedVariations['size']);
  const priceModifier = Object.values(selectedVariations).reduce((sum, varId) => {
    const v = variations.find((vr: any) => vr.id === varId);
    return sum + (v ? Number(v.price_modifier) : 0);
  }, 0);

  // If a size variation is selected and it has a calculated price (price_modifier > 0), use that as the unit price
  const unitPrice = selectedSizeVar && Number(selectedSizeVar.price_modifier) > 0
    ? Number(selectedSizeVar.price_modifier)
    : Number(product?.base_price || 0) + priceModifier;
  const totalPrice = product ? unitPrice * quantity : 0;
  const selectedWeight = selectedSizeVar ? Number(selectedSizeVar.weight_grams || 0) : null;
  const selectedDimensions = selectedSizeVar ? (selectedSizeVar as any).dimensions : null;
  const images = product ? (product.images as string[]) || [] : [];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-4 w-48 mb-6" />
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
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition-colors">{t.store.title}</Link>
          <span className="text-border">/</span>
          {product.categories && (
            <>
              <span>{language === 'es' ? product.categories.name_es : product.categories.name_en}</span>
              <span className="text-border">/</span>
            </>
          )}
          <span className="text-foreground truncate">{language === 'es' ? product.name_es : product.name_en}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* Image Gallery with Zoom */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div
              className="aspect-square bg-card border border-border/50 rounded-2xl overflow-hidden mb-3 relative cursor-zoom-in group"
              onMouseEnter={() => setIsZooming(true)}
              onMouseLeave={() => setIsZooming(false)}
              onMouseMove={handleMouseMove}
            >
              {images.length > 0 ? (
                <img
                  src={images[selectedImage]}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-200"
                  style={isZooming ? {
                    transform: 'scale(2)',
                    transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                  } : undefined}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Box className="w-24 h-24 text-muted-foreground/20" />
                </div>
              )}
              {images.length > 0 && (
                <div className="absolute bottom-3 right-3 bg-background/70 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <ZoomIn className="w-3 h-3" />
                  {language === 'es' ? 'Zoom' : 'Hover to zoom'}
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${i === selectedImage ? 'border-primary shadow-gold' : 'border-border/50 hover:border-border'}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Product Info */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h1 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-foreground leading-tight">
                  {language === 'es' ? product.name_es : product.name_en}
                </h1>
                <div className="flex items-center gap-2 shrink-0 pt-1">
                  <ShareMenu slug={product.slug} productName={language === 'es' ? product.name_es : product.name_en} size="md" />
                  <button onClick={toggleFavorite} className="p-2 rounded-full hover:bg-primary/10 transition-colors">
                    <Heart className={`w-6 h-6 ${isFav ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3">
                <span className="text-3xl font-bold text-gradient-gold">${totalPrice.toFixed(2)}</span>
                <LikeButton productId={product.id} size="md" />
              </div>
              <Badge className="mt-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
                {t.product.inStock}
              </Badge>
              {selectedWeight != null && selectedWeight > 0 && (
                <Badge variant="outline" className="mt-2 ml-2 gap-1">
                  <Weight className="w-3 h-3" />
                  {selectedWeight}{t.product.grams}
                </Badge>
              )}
              {selectedDimensions && (
                <Badge variant="outline" className="mt-2 ml-2 gap-1">
                  <Ruler className="w-3 h-3" />
                  {selectedDimensions}mm
                </Badge>
              )}
            </div>

            <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
              {language === 'es' ? product.description_es : product.description_en}
            </p>

            {/* Materials */}
            {productMaterialsList.length > 0 && (
              <div>
                <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">{t.product.material}</h3>
                <div className="flex flex-wrap gap-2">
                  {productMaterialsList.map((pm: any) => (
                    <span key={pm.id} className="px-3 py-1.5 rounded-lg bg-secondary text-sm text-foreground border border-border/50">
                      {language === 'es' ? pm.materials.name_es : pm.materials.name_en}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Variations */}
            {Object.entries(variationsByType).map(([type, vars]) => (
              <div key={type}>
                <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  {type === 'color' ? t.product.color : type === 'size' ? t.product.size : type}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(vars as any[]).map((v: any) => {
                    const isSize = type === 'size';
                    const vPrice = isSize && Number(v.price_modifier) > 0 ? Number(v.price_modifier) : null;
                    const vWeight = isSize && v.weight_grams ? Number(v.weight_grams) : null;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariations(prev => ({ ...prev, [type]: v.id }))}
                        className={`flex flex-col items-start gap-0.5 px-3 py-2 rounded-lg border text-sm transition-all ${
                          selectedVariations[type] === v.id
                            ? 'border-primary bg-primary/10 text-primary shadow-gold'
                            : 'border-border/50 bg-secondary text-foreground hover:border-primary/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {type === 'color' && (
                            <span className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: v.value }} />
                          )}
                          <span>{language === 'es' ? v.name_es : v.name_en}</span>
                        </div>
                        {isSize && (vWeight || vPrice || v.dimensions) && (
                          <span className="text-[10px] text-muted-foreground">
                            {vWeight ? `${vWeight}${t.product.grams}` : ''}
                            {vWeight && v.dimensions ? ' · ' : ''}
                            {v.dimensions ? `${v.dimensions}mm` : ''}
                            {(vWeight || v.dimensions) && vPrice ? ' · ' : ''}
                            {vPrice ? `$${vPrice.toFixed(2)}` : ''}
                          </span>
                        )}
                        {!isSize && Number(v.price_modifier) > 0 && (
                          <span className="text-xs text-muted-foreground">+${Number(v.price_modifier).toFixed(2)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Quantity */}
            <div>
              <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">{t.product.quantity}</h3>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="border-border/50 h-9 w-9">
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="font-display font-bold text-lg w-8 text-center">{quantity}</span>
                <Button variant="outline" size="icon" onClick={() => setQuantity(quantity + 1)} className="border-border/50 h-9 w-9">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Special Notes */}
            <div>
              <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">{t.product.specialNotes}</h3>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.product.specialNotesPlaceholder}
                className="bg-card border-border/50"
                rows={3}
              />
            </div>

            {/* Actions */}
            <Button
              onClick={() => {
                addToCart({
                  productId: product.id,
                  productName: language === 'es' ? product.name_es : product.name_en,
                  productImage: images[0] || '',
                  slug: product.slug,
                  quantity,
                  unitPrice: unitPrice,
                  selectedVariations: Object.entries(selectedVariations).map(([type, varId]) => {
                    const v = variations.find((vr: any) => vr.id === varId);
                    return { id: varId, type, name: v ? (language === 'es' ? v.name_es : v.name_en) : '', priceModifier: v ? Number(v.price_modifier) : 0 };
                  }),
                  notes,
                });
                toast({ title: language === 'es' ? 'Agregado al carrito' : 'Added to cart' });
              }}
              className="w-full bg-gradient-gold text-primary-foreground font-semibold gap-2 h-12 shadow-gold hover:shadow-gold-lg transition-shadow"
            >
              <ShoppingCart className="w-5 h-5" />
              {t.product.addToCart}
            </Button>
          </motion.div>
        </div>

        {/* Reviews Section */}
        <div className="mt-16 border-t border-border/30 pt-12">
          <ProductReviews productId={product.id} />
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="font-display font-bold text-xl sm:text-2xl mb-5">{t.product.relatedModels}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {relatedProducts.map((rp: any, i: number) => (
                <ProductCard key={rp.id} product={rp} index={i} showBadges={false} />
              ))}
            </div>
          </div>
        )}
      </motion.div>
      <Footer />
    </div>
  );
}
