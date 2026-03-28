import { motion } from 'framer-motion';
import { ArrowRight, Heart, Box } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';

export default function FeaturedSection() {
  const { language, t } = useLanguage();

  const { data: products = [] } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name_en, name_es)')
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  if (products.length === 0) return null;

  return (
    <section className="py-24 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12"
        >
          <div>
            <h2 className="font-display font-black text-4xl sm:text-5xl mb-4">
              {t.featured.title}{' '}
              <span className="text-gradient-gold">{t.featured.titleHighlight}</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl">{t.featured.subtitle}</p>
          </div>
          <Link to="/3dmodels" className="mt-4 sm:mt-0">
            <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
              {t.featured.viewAll}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product: any, i: number) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group"
            >
              <Link to={`/3dmodels/${product.slug}`}>
                <div className="rounded-2xl bg-card border border-border/50 overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-gold">
                  <div className="aspect-square bg-secondary relative overflow-hidden">
                    {(product.images as string[])?.length > 0 ? (
                      <img src={(product.images as string[])[0]} alt={language === 'es' ? product.name_es : product.name_en} className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Box className="w-16 h-16 text-muted-foreground/30" />
                      </div>
                    )}
                    <button className="absolute top-3 right-3 w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/20">
                      <Heart className="w-4 h-4 text-foreground" />
                    </button>
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
                    <div className="mt-1 text-lg font-bold text-gradient-gold">
                      ${Number(product.base_price).toFixed(2)}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
