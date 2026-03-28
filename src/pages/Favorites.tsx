import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Heart, Box, ShoppingBag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

function FavoriteCardSkeleton() {
  return (
    <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
      <Skeleton className="aspect-square w-full" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-6 w-1/3" />
      </div>
    </div>
  );
}

export default function Favorites() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { toast } = useToast();

  const { data: favoriteProducts = [], isLoading, refetch } = useQuery({
    queryKey: ['favorite-products', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: favs, error: favErr } = await supabase
        .from('favorites')
        .select('product_id')
        .eq('user_id', user.id);
      if (favErr) throw favErr;
      if (!favs.length) return [];
      const ids = favs.map(f => f.product_id);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .in('id', ids);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const removeFavorite = async (productId: string) => {
    if (!user) return;
    await supabase.from('favorites').delete().eq('user_id', user.id).eq('product_id', productId);
    refetch();
    toast({ title: t.favorites.removed });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-display font-black text-4xl mb-2">{t.favorites.title}</h1>
        <p className="text-muted-foreground mb-8">{t.favorites.subtitle}</p>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <FavoriteCardSkeleton key={i} />
            ))}
          </div>
        ) : favoriteProducts.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground mb-4">{t.favorites.empty}</p>
            <Link to="/3dmodels">
              <Button className="bg-gradient-gold text-primary-foreground gap-2">
                <ShoppingBag className="w-4 h-4" />
                {t.favorites.browseStore}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {favoriteProducts.map((product: any, i: number) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group"
              >
                <div className="rounded-2xl bg-card border border-border/50 overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-gold relative">
                  <Link to={`/3dmodels/${product.slug}`}>
                    <div className="aspect-square bg-secondary relative overflow-hidden">
                      {(product.images as string[])?.length > 0 ? (
                        <img src={(product.images as string[])[0]} alt={language === 'es' ? product.name_es : product.name_en} className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Box className="w-16 h-16 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                  </Link>
                  <button
                    onClick={() => removeFavorite(product.id)}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-destructive/20 transition-colors"
                  >
                    <Heart className="w-4 h-4 fill-primary text-primary" />
                  </button>
                  <div className="p-4">
                    <Link to={`/3dmodels/${product.slug}`}>
                      <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {language === 'es' ? product.name_es : product.name_en}
                      </h3>
                    </Link>
                    <div className="mt-1 text-lg font-bold text-gradient-gold">
                      ${Number(product.base_price).toFixed(2)}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
      <Footer />
    </div>
  );
}
