import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Box, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';

const WHATSAPP_NUMBER = '16893324656';

export default function Catalog() {
  const { language, t } = useLanguage();

  const { data: products = [] } = useQuery({
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

  const getWhatsAppUrl = (product: any) => {
    const name = language === 'es' ? product.name_es : product.name_en;
    const desc = language === 'es' ? (product.description_es || '') : (product.description_en || '');
    const url = `${window.location.origin}/3dmodels/${product.slug}`;
    const message = `${t.catalog.messagePrefix}${name}${t.catalog.messageDesc}${desc}${t.catalog.messageUrl}${url}`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {products.map((product: any, i: number) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group"
            >
              <div className="rounded-2xl bg-card border border-border/50 overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-gold">
                <div className="aspect-square bg-secondary relative overflow-hidden">
                  {(product.images as string[])?.length > 0 ? (
                    <img src={(product.images as string[])[0]} alt={language === 'es' ? product.name_es : product.name_en} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Box className="w-16 h-16 text-muted-foreground/30" />
                    </div>
                  )}
                  {product.categories && (
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-background/80 backdrop-blur-sm text-xs font-medium text-foreground">
                      {language === 'es' ? product.categories.name_es : product.categories.name_en}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {language === 'es' ? product.name_es : product.name_en}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {language === 'es' ? product.description_es : product.description_en}
                  </p>
                  <div className="mt-2 text-lg font-bold text-gradient-gold">
                    ${Number(product.base_price).toFixed(2)}
                  </div>
                  <a href={getWhatsAppUrl(product)} target="_blank" rel="noopener noreferrer" className="block mt-3">
                    <Button className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white gap-2 font-semibold">
                      <MessageCircle className="w-4 h-4" />
                      {t.catalog.orderWhatsapp}
                    </Button>
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
