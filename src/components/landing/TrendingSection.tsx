import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, ChevronLeft, ChevronRight, Box } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import LikeButton from '@/components/LikeButton';

interface TrendingSectionProps {
  products: any[];
  likeCounts: Record<string, number>;
}

export default function TrendingSection({ products, likeCounts }: TrendingSectionProps) {
  const { language } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sort by likes and take top items
  const trending = [...products]
    .sort((a, b) => (likeCounts[b.id] || 0) - (likeCounts[a.id] || 0))
    .slice(0, 10);

  if (trending.length === 0) return null;

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.offsetWidth * 0.6;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold text-lg sm:text-xl text-foreground">
            {language === 'es' ? 'Tendencias' : 'Trending Now'}
          </h2>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => scroll('left')}
            className="w-8 h-8 rounded-full bg-secondary/60 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-8 h-8 rounded-full bg-secondary/60 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1 snap-x snap-mandatory"
      >
        {trending.map((product, i) => {
          const images = (product.images as string[]) || [];
          const name = language === 'es' ? product.name_es : product.name_en;
          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="shrink-0 w-[200px] sm:w-[220px] snap-start"
            >
              <Link to={`/3dmodels/${product.slug}`} className="group block">
                <div className="rounded-xl bg-card border border-border/50 overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-gold">
                  <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
                    {images.length > 0 ? (
                      <img
                        src={images[0]}
                        alt={name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Box className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute top-1.5 left-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-primary/90 text-primary-foreground text-[10px] font-bold">
                        🔥 #{i + 1}
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <h3 className="font-display font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                      {name}
                    </h3>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-bold text-gradient-gold">
                        ${Number(product.base_price).toFixed(2)}
                      </span>
                      <LikeButton productId={product.id} countOnly externalCount={likeCounts[product.id] || 0} size="sm" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
