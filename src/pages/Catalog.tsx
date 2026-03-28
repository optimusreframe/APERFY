import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Box, MessageCircle, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import LikeButton from '@/components/LikeButton';
import ShareMenu from '@/components/ShareMenu';

const WHATSAPP_NUMBER = '16893324656';
const PUBLIC_URL = 'https://a3dtoprint.lovable.app';

function CatalogCardSkeleton() {
  return (
    <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
      <Skeleton className="aspect-[4/5] w-full" />
      <div className="p-3 sm:p-4 space-y-2">
        <Skeleton className="h-4 sm:h-5 w-3/4" />
        <Skeleton className="h-3 sm:h-4 w-full" />
        <Skeleton className="h-5 sm:h-6 w-1/3" />
      </div>
    </div>
  );
}

export default function Catalog() {
  const { language, t } = useLanguage();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['catalog-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name_en, name_es)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: productMaterials = [] } = useQuery({
    queryKey: ['product-materials', selectedProduct?.id],
    enabled: !!selectedProduct,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_materials')
        .select('*, materials(name_en, name_es)')
        .eq('product_id', selectedProduct.id);
      if (error) throw error;
      return data;
    },
  });

  const { data: productVariations = [] } = useQuery({
    queryKey: ['product-variations', selectedProduct?.id],
    enabled: !!selectedProduct,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variations')
        .select('*')
        .eq('product_id', selectedProduct.id)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const getWhatsAppUrl = (product: any) => {
    const name = language === 'es' ? product.name_es : product.name_en;
    const desc = language === 'es' ? (product.description_es || '') : (product.description_en || '');
    const url = `${PUBLIC_URL}/3dmodels/${product.slug}`;
    const message = language === 'es'
      ? `Hola, me interesa este modelo.\n\nModelo: ${name}\nDescripción: ${desc}\nURL: ${url}`
      : `Hi, I'm interested in this model.\n\nModel: ${name}\nDescription: ${desc}\nURL: ${url}`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  };

  const images = selectedProduct ? (selectedProduct.images as string[] || []) : [];

  const handleOpenProduct = (product: any) => {
    setSelectedProduct(product);
    setActiveImageIndex(0);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-display font-black text-4xl sm:text-5xl mb-2">
            {language === 'es' ? 'Catálogo' : 'Catalog'}
          </h1>
          <p className="text-muted-foreground text-lg">
            {language === 'es'
              ? 'Explora nuestros modelos y ordena directamente por WhatsApp.'
              : 'Browse our models and order directly via WhatsApp.'}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <CatalogCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {products.map((product: any, i: number) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group cursor-pointer"
                onClick={() => handleOpenProduct(product)}
              >
                <div className="rounded-2xl bg-card border border-border/50 overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-gold">
                  <div className="aspect-[4/5] bg-secondary relative overflow-hidden">
                    {(product.images as string[])?.length > 0 ? (
                      <img src={(product.images as string[])[0]} alt={language === 'es' ? product.name_es : product.name_en} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Box className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/30" />
                      </div>
                    )}
                    {/* Action buttons */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <ShareMenu slug={product.slug} productName={language === 'es' ? product.name_es : product.name_en} />
                      </div>
                    </div>
                    {product.categories && (
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-background/80 backdrop-blur-sm text-[10px] sm:text-xs font-medium text-foreground">
                        {language === 'es' ? product.categories.name_es : product.categories.name_en}
                      </div>
                    )}
                  </div>
                  <div className="p-3 sm:p-4">
                    <h3 className="font-display font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                      {language === 'es' ? product.name_es : product.name_en}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2 hidden sm:block">
                      {language === 'es' ? product.description_es : product.description_en}
                    </p>
                    <div className="flex items-center justify-between mt-1 sm:mt-2">
                      <span className="text-base sm:text-lg font-bold text-gradient-gold">
                        ${Number(product.base_price).toFixed(2)}
                      </span>
                      <div onClick={(e) => e.stopPropagation()}>
                        <LikeButton productId={product.id} size="sm" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  {language === 'es' ? selectedProduct.name_es : selectedProduct.name_en}
                </DialogTitle>
              </DialogHeader>

              {images.length > 0 && (
                <div className="space-y-3">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-secondary">
                    <img
                      src={images[activeImageIndex]}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={() => setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-background transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setActiveImageIndex((prev) => (prev + 1) % images.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-background transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                  {images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {images.map((img: string, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImageIndex(idx)}
                          className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                            idx === activeImageIndex ? 'border-primary' : 'border-transparent'
                          }`}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-2xl font-bold text-gradient-gold">
                    ${Number(selectedProduct.base_price).toFixed(2)}
                  </span>
                  {selectedProduct.categories && (
                    <Badge variant="secondary">
                      {language === 'es' ? selectedProduct.categories.name_es : selectedProduct.categories.name_en}
                    </Badge>
                  )}
                  <div className="ml-auto flex items-center gap-3">
                    <LikeButton productId={selectedProduct.id} size="md" />
                    <ShareMenu slug={selectedProduct.slug} productName={language === 'es' ? selectedProduct.name_es : selectedProduct.name_en} size="md" />
                  </div>
                </div>

                <p className="text-muted-foreground leading-relaxed">
                  {language === 'es' ? selectedProduct.description_es : selectedProduct.description_en}
                </p>

                {productMaterials.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">
                      {language === 'es' ? 'Materiales disponibles' : 'Available Materials'}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {productMaterials.map((pm: any) => (
                        <Badge key={pm.id} variant="outline">
                          {language === 'es' ? pm.materials.name_es : pm.materials.name_en}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {productVariations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">
                      {language === 'es' ? 'Variaciones' : 'Variations'}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {productVariations.map((v: any) => (
                        <Badge key={v.id} variant="outline">
                          {language === 'es' ? v.name_es : v.name_en}
                          {v.price_modifier > 0 && ` (+$${v.price_modifier.toFixed(2)})`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <Link to={`/3dmodels/${selectedProduct.slug}`} className="block" onClick={() => setSelectedProduct(null)}>
                    <Button className="w-full bg-gradient-gold text-primary-foreground gap-2 font-semibold text-base py-5">
                      <ShoppingBag className="w-5 h-5" />
                      {language === 'es' ? 'Comprar Online' : 'Buy Online'}
                    </Button>
                  </Link>
                  <a href={getWhatsAppUrl(selectedProduct)} target="_blank" rel="noopener noreferrer" className="block">
                    <Button className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white gap-2 font-semibold text-base py-5">
                      <MessageCircle className="w-5 h-5" />
                      {t.catalog.orderWhatsapp}
                    </Button>
                  </a>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
