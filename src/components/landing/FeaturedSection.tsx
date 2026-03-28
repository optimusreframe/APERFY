import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Box } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import LikeButton from '@/components/LikeButton';
import FavoriteCount from '@/components/FavoriteCount';
import ShareMenu from '@/components/ShareMenu';

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

  const productIds = useMemo(() => products.map((p: any) => p.id), [products]);

  const { data: likeCounts = {} } = useQuery({
    queryKey: ['bulk-like-counts-featured', productIds],
    enabled: productIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_likes')
        .select('product_id')
        .in('product_id', productIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((row: any) => { counts[row.product_id] = (counts[row.product_id] || 0) + 1; });
      return counts;
    },
  });

  const { data: favCounts = {} } = useQuery({
    queryKey: ['bulk-fav-counts-featured', productIds],
    enabled: productIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('product_id')
        .in('product_id', productIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((row: any) => { counts[row.product_id] = (counts[row.product_id] || 0) + 1; });
      return counts;
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
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
                  <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
                    {(product.images as string[])?.length > 0 ? (
                      <img src={(product.images as string[])[0]} alt={language === 'es' ? product.name_es : product.name_en} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Box className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
                        <ShareMenu slug={product.slug} productName={language === 'es' ? product.name_es : product.name_en} />
                      </div>
                    </div>
                    {product.categories && (
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-background/80 backdrop-blur-sm text-[10px] sm:text-xs font-medium text-foreground">
                        {language === 'es' ? product.categories.name_es : product.categories.name_en}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-display font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                      {language === 'es' ? product.name_es : product.name_en}
                    </h3>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-base sm:text-lg font-bold text-gradient-gold">
                        ${Number(product.base_price).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/30">
                      <LikeButton productId={product.id} countOnly externalCount={likeCounts[product.id] || 0} size="sm" />
                      <FavoriteCount count={favCounts[product.id] || 0} />
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
