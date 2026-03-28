import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Box, ArrowLeft, Minus, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function ProductDetail() {
  const { slug } = useParams();
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);

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

  // Group variations by type
  const variationsByType = variations.reduce((acc: Record<string, any[]>, v: any) => {
    if (!acc[v.type]) acc[v.type] = [];
    acc[v.type].push(v);
    return acc;
  }, {});

  const priceModifier = Object.values(selectedVariations).reduce((sum, varId) => {
    const v = variations.find((vr: any) => vr.id === varId);
    return sum + (v ? Number(v.price_modifier) : 0);
  }, 0);

  const totalPrice = product ? (Number(product.base_price) + priceModifier) * quantity : 0;
  const images = product ? (product.images as string[]) || [] : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 flex items-center justify-center h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
          <Link to="/3dmodels"><Button variant="outline" className="mt-4 gap-2"><ArrowLeft className="w-4 h-4" />Back to Store</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/3dmodels" className="hover:text-foreground transition-colors">{t.store.title}</Link>
          <span>/</span>
          {product.categories && (
            <>
              <span>{language === 'es' ? product.categories.name_es : product.categories.name_en}</span>
              <span>/</span>
            </>
          )}
          <span className="text-foreground">{language === 'es' ? product.name_es : product.name_en}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* Image Gallery */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="aspect-square bg-card border border-border rounded-2xl overflow-hidden mb-3">
              {images.length > 0 ? (
                <img src={images[selectedImage]} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Box className="w-24 h-24 text-muted-foreground/20" />
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-colors ${i === selectedImage ? 'border-primary' : 'border-border'}`}
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
              <div className="flex items-start justify-between">
                <h1 className="font-display font-black text-3xl sm:text-4xl text-foreground">
                  {language === 'es' ? product.name_es : product.name_en}
                </h1>
                <button onClick={toggleFavorite} className="p-2 rounded-full hover:bg-primary/10 transition-colors">
                  <Heart className={`w-6 h-6 ${isFav ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                </button>
              </div>
              <div className="mt-2 text-3xl font-bold text-gradient-gold">${totalPrice.toFixed(2)}</div>
              <span className="inline-block mt-2 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                {t.product.inStock}
              </span>
            </div>

            <p className="text-muted-foreground leading-relaxed">
              {language === 'es' ? product.description_es : product.description_en}
            </p>

            {/* Materials */}
            {productMaterialsList.length > 0 && (
              <div>
                <h3 className="font-display font-semibold text-sm text-foreground mb-2">{t.product.material}</h3>
                <div className="flex flex-wrap gap-2">
                  {productMaterialsList.map((pm: any) => (
                    <span key={pm.id} className="px-3 py-1.5 rounded-lg bg-secondary text-sm text-foreground">
                      {language === 'es' ? pm.materials.name_es : pm.materials.name_en}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Variations */}
            {Object.entries(variationsByType).map(([type, vars]) => (
              <div key={type}>
                <h3 className="font-display font-semibold text-sm text-foreground mb-2 capitalize">
                  {type === 'color' ? t.product.color : type === 'size' ? t.product.size : type}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(vars as any[]).map((v: any) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariations(prev => ({ ...prev, [type]: v.id }))}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all ${
                        selectedVariations[type] === v.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-secondary text-foreground hover:border-primary/30'
                      }`}
                    >
                      {type === 'color' && (
                        <span className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: v.value }} />
                      )}
                      {language === 'es' ? v.name_es : v.name_en}
                      {Number(v.price_modifier) > 0 && (
                        <span className="text-xs text-muted-foreground">+${Number(v.price_modifier).toFixed(2)}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Quantity */}
            <div>
              <h3 className="font-display font-semibold text-sm text-foreground mb-2">{t.product.quantity}</h3>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="border-border">
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="font-display font-bold text-lg w-8 text-center">{quantity}</span>
                <Button variant="outline" size="icon" onClick={() => setQuantity(quantity + 1)} className="border-border">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Special Notes */}
            <div>
              <h3 className="font-display font-semibold text-sm text-foreground mb-2">{t.product.specialNotes}</h3>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.product.specialNotesPlaceholder}
                className="bg-card border-border"
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  addToCart({
                    productId: product.id,
                    productName: language === 'es' ? product.name_es : product.name_en,
                    productImage: images[0] || '',
                    slug: product.slug,
                    quantity,
                    unitPrice: Number(product.base_price),
                    selectedVariations: Object.entries(selectedVariations).map(([type, varId]) => {
                      const v = variations.find((vr: any) => vr.id === varId);
                      return { id: varId, type, name: v ? (language === 'es' ? v.name_es : v.name_en) : '', priceModifier: v ? Number(v.price_modifier) : 0 };
                    }),
                    notes,
                  });
                  toast({ title: language === 'es' ? 'Agregado al carrito' : 'Added to cart' });
                }}
                className="flex-1 bg-gradient-gold text-primary-foreground font-semibold gap-2 h-12"
              >
                <ShoppingCart className="w-5 h-5" />
                {t.product.addToCart}
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-20">
            <h2 className="font-display font-bold text-2xl mb-6">{t.product.relatedModels}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {relatedProducts.map((rp: any) => (
                <Link key={rp.id} to={`/3dmodels/${rp.slug}`} className="group">
                  <div className="rounded-2xl bg-card border border-border/50 overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-gold">
                    <div className="aspect-square bg-secondary relative overflow-hidden">
                      {(rp.images as string[])?.length > 0 ? (
                        <img src={(rp.images as string[])[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Box className="w-12 h-12 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {language === 'es' ? rp.name_es : rp.name_en}
                      </h3>
                      <div className="mt-1 text-lg font-bold text-gradient-gold">${Number(rp.base_price).toFixed(2)}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
