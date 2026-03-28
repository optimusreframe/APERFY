import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, Heart, Box, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import LikeButton from '@/components/LikeButton';
import ShareMenu from '@/components/ShareMenu';

function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
      <Skeleton className="aspect-[4/5] w-full" />
      <div className="p-3 sm:p-4 space-y-2">
        <Skeleton className="h-4 sm:h-5 w-3/4" />
        <Skeleton className="h-5 sm:h-6 w-1/3" />
      </div>
    </div>
  );
}

export default function Store() {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, 100]);
  const [showFilters, setShowFilters] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['store-products'],
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

  const { data: categories = [] } = useQuery({
    queryKey: ['store-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').eq('is_active', true).order('name_en');
      if (error) throw error;
      return data;
    },
  });

  const { data: materials = [] } = useQuery({
    queryKey: ['store-materials'],
    queryFn: async () => {
      const { data, error } = await supabase.from('materials').select('*').eq('is_active', true).order('name_en');
      if (error) throw error;
      return data;
    },
  });

  const { data: productMaterials = [] } = useQuery({
    queryKey: ['store-product-materials'],
    queryFn: async () => {
      const { data, error } = await supabase.from('product_materials').select('*');
      if (error) throw error;
      return data;
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

    if (selectedCategories.length > 0) {
      result = result.filter((p: any) => selectedCategories.includes(p.category_id));
    }

    if (selectedMaterials.length > 0) {
      const productIdsWithMaterial = productMaterials
        .filter((pm: any) => selectedMaterials.includes(pm.material_id))
        .map((pm: any) => pm.product_id);
      result = result.filter((p: any) => productIdsWithMaterial.includes(p.id));
    }

    result = result.filter((p: any) => Number(p.base_price) >= priceRange[0] && Number(p.base_price) <= priceRange[1]);

    switch (sort) {
      case 'price_asc': result.sort((a: any, b: any) => Number(a.base_price) - Number(b.base_price)); break;
      case 'price_desc': result.sort((a: any, b: any) => Number(b.base_price) - Number(a.base_price)); break;
      case 'popular': result.sort((a: any, b: any) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0)); break;
      default: break;
    }

    return result;
  }, [products, search, sort, selectedCategories, selectedMaterials, priceRange, productMaterials]);

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const toggleMaterial = (id: string) => {
    setSelectedMaterials(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedMaterials([]);
    setPriceRange([0, 100]);
    setSearch('');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-black text-4xl sm:text-5xl mb-2">
            {t.store.title}
          </h1>
          <p className="text-muted-foreground text-lg">{t.store.subtitle}</p>
        </div>

        {/* Top bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.store.search}
              className="pl-10 bg-card border-border"
            />
          </div>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-full sm:w-48 bg-card border-border">
              <SelectValue placeholder={t.store.sortBy} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t.store.newest}</SelectItem>
              <SelectItem value="price_asc">{t.store.priceAsc}</SelectItem>
              <SelectItem value="price_desc">{t.store.priceDesc}</SelectItem>
              <SelectItem value="popular">{t.store.popular}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden gap-2 border-border"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {t.store.filters}
          </Button>
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className={`${showFilters ? 'block' : 'hidden'} lg:block w-full lg:w-64 shrink-0 space-y-6`}>
            <div className="bg-card border border-border rounded-xl p-5 space-y-6">
              <div>
                <h3 className="font-display font-semibold text-sm text-foreground mb-3">{t.store.category}</h3>
                <div className="space-y-2">
                  {categories.map((c: any) => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <Checkbox
                        checked={selectedCategories.includes(c.id)}
                        onCheckedChange={() => toggleCategory(c.id)}
                      />
                      {language === 'es' ? c.name_es : c.name_en}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-display font-semibold text-sm text-foreground mb-3">{t.store.materialFilter}</h3>
                <div className="space-y-2">
                  {materials.map((m: any) => (
                    <label key={m.id} className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <Checkbox
                        checked={selectedMaterials.includes(m.id)}
                        onCheckedChange={() => toggleMaterial(m.id)}
                      />
                      {language === 'es' ? m.name_es : m.name_en}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-display font-semibold text-sm text-foreground mb-3">{t.store.priceRange}</h3>
                <Slider
                  value={priceRange}
                  onValueChange={setPriceRange}
                  min={0}
                  max={100}
                  step={1}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>${priceRange[0]}</span>
                  <span>${priceRange[1]}</span>
                </div>
              </div>

              <Button variant="ghost" onClick={clearFilters} className="w-full text-muted-foreground hover:text-foreground gap-2">
                <X className="w-3 h-3" />
                {t.store.clearFilters}
              </Button>
            </div>
          </aside>

          {/* Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Box className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>{t.store.noResults}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                {filtered.map((product: any, i: number) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group"
                  >
                    <div className="relative rounded-2xl bg-card border border-border/50 overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-gold">
                      <Link to={`/3dmodels/${product.slug}`}>
                        <div className="aspect-[4/5] bg-secondary relative overflow-hidden">
                          {(product.images as string[])?.length > 0 ? (
                            <img src={(product.images as string[])[0]} alt={language === 'es' ? product.name_es : product.name_en} className="w-full h-full object-cover" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Box className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/30" />
                            </div>
                          )}
                          {product.categories && (
                            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-background/80 backdrop-blur-sm text-[10px] sm:text-xs font-medium text-foreground">
                              {language === 'es' ? product.categories.name_es : product.categories.name_en}
                            </div>
                          )}
                        </div>
                      </Link>
                      {/* Action buttons */}
                      <div className="absolute top-2 right-2 flex flex-col gap-1.5">
                        <button
                          onClick={() => toggleFavorite(product.id)}
                          className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 sm:opacity-0 transition-opacity hover:bg-primary/20"
                        >
                          <Heart className={`w-4 h-4 ${favorites.includes(product.id) ? 'fill-primary text-primary' : 'text-foreground'}`} />
                        </button>
                        <div className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 sm:opacity-0 transition-opacity">
                          <ShareMenu slug={product.slug} productName={language === 'es' ? product.name_es : product.name_en} />
                        </div>
                      </div>
                      <div className="p-3 sm:p-4">
                        <Link to={`/3dmodels/${product.slug}`}>
                          <h3 className="font-display font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                            {language === 'es' ? product.name_es : product.name_en}
                          </h3>
                        </Link>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-base sm:text-lg font-bold text-gradient-gold">
                            ${Number(product.base_price).toFixed(2)}
                          </span>
                          <LikeButton productId={product.id} size="sm" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
      <Footer />
    </div>
  );
}
