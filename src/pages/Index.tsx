import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, Box, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HeroBanner from '@/components/landing/HeroBanner';
import CategoryPills from '@/components/landing/CategoryPills';
import TrendingSection from '@/components/landing/TrendingSection';
import ProductCard from '@/components/ProductCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-card border border-border/50 overflow-hidden">
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Index() {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['all-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(id, name_en, name_es, slug)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const productIds = useMemo(() => products.map((p: any) => p.id), [products]);

  const { data: likeCounts = {} } = useQuery({
    queryKey: ['bulk-like-counts', productIds],
    enabled: productIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_likes')
        .select('product_id')
        .in('product_id', productIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((row: any) => {
        counts[row.product_id] = (counts[row.product_id] || 0) + 1;
      });
      return counts;
    },
  });

  const { data: favCounts = {} } = useQuery({
    queryKey: ['bulk-fav-counts', productIds],
    enabled: productIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('product_id')
        .in('product_id', productIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((row: any) => {
        counts[row.product_id] = (counts[row.product_id] || 0) + 1;
      });
      return counts;
    },
  });

  const { data: favorites = [], refetch: refetchFavorites } = useQuery({
    queryKey: ['user-favorites', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from('favorites').select('product_id').eq('user_id', user.id);
      if (error) throw error;
      return data.map((f: any) => f.product_id);
    },
    enabled: !!user,
  });

  const toggleFavorite = async (productId: string) => {
    if (!user) {
      toast({ title: language === 'es' ? 'Inicia sesión para guardar favoritos' : 'Sign in to save favorites', variant: 'destructive' });
      return;
    }
    const isFav = favorites.includes(productId);
    if (isFav) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('product_id', productId);
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, product_id: productId });
    }
    refetchFavorites();
  };

  const filtered = useMemo(() => {
    let result = [...products];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p: any) =>
        p.name_en.toLowerCase().includes(q) || p.name_es.toLowerCase().includes(q)
      );
    }
    if (selectedCategory) {
      result = result.filter((p: any) => p.category_id === selectedCategory);
    }
    switch (sort) {
      case 'price_asc': result.sort((a: any, b: any) => Number(a.base_price) - Number(b.base_price)); break;
      case 'price_desc': result.sort((a: any, b: any) => Number(b.base_price) - Number(a.base_price)); break;
      case 'popular': result.sort((a: any, b: any) => (likeCounts[b.id] || 0) - (likeCounts[a.id] || 0)); break;
      default: break;
    }
    return result;
  }, [products, search, sort, selectedCategory, likeCounts]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 sm:pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Banner */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <HeroBanner />
        </motion.div>

        {/* Search + Sort bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 mt-6"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.store.search}
              className="pl-10 bg-card border-border/50 h-10"
            />
          </div>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-full sm:w-44 bg-card border-border/50 h-10">
              <SelectValue placeholder={t.store.sortBy} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t.store.newest}</SelectItem>
              <SelectItem value="price_asc">{t.store.priceAsc}</SelectItem>
              <SelectItem value="price_desc">{t.store.priceDesc}</SelectItem>
              <SelectItem value="popular">{t.store.popular}</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Category Pills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mt-5"
        >
          <CategoryPills selected={selectedCategory} onSelect={setSelectedCategory} />
        </motion.div>

        {/* Trending Section */}
        {!isLoading && !search && !selectedCategory && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mt-8"
          >
            <TrendingSection products={products} likeCounts={likeCounts} />
          </motion.div>
        )}

        {/* Results count */}
        <div className="flex items-center justify-between mt-8 mb-4">
          <p className="text-sm text-muted-foreground">
            {isLoading ? '...' : (
              language === 'es'
                ? `${filtered.length} modelo${filtered.length !== 1 ? 's' : ''}`
                : `${filtered.length} model${filtered.length !== 1 ? 's' : ''}`
            )}
          </p>
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <GridSkeleton />
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Box className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>{t.store.noResults}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map((product: any, i: number) => (
              <ProductCard
                key={product.id}
                product={product}
                index={i}
                likeCount={likeCounts[product.id] || 0}
                favCount={favCounts[product.id] || 0}
                isFavorite={favorites.includes(product.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
