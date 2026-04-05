import { useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, ChevronLeft, ChevronRight, Box, Crown, Trophy, Medal } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import LikeButton from '@/components/LikeButton';

interface TrendingSectionProps {
  products: any[];
  likeCounts: Record<string, number>;
}

const rankIcons = [Crown, Trophy, Medal];

export default function TrendingSection({ products, likeCounts }: TrendingSectionProps) {
  const { language } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, scrollLeft: 0 });

  const scroll = useCallback((dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.offsetWidth * 0.6;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    dragStart.current = { x: e.pageX, scrollLeft: scrollRef.current.scrollLeft };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const dx = e.pageX - dragStart.current.x;
    scrollRef.current.scrollLeft = dragStart.current.scrollLeft - dx;
  }, [isDragging]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  return (
    <div className="relative rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] via-card to-primary/[0.02] p-4 sm:p-6 shadow-[0_0_30px_rgba(212,160,23,0.06)]">
      {/* Decorative corner glow */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-primary/[0.06] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-24 h-24 bg-primary/[0.04] rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 relative">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <TrendingUp className="w-4.5 h-4.5 text-primary" />
            </div>
            <h2 className="font-display font-black text-xl sm:text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary via-gold-light to-primary">
              {language === 'es' ? 'Tendencias' : 'Trending Now'}
            </h2>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm ml-[42px]">
            {language === 'es' ? 'Los modelos más populares de la comunidad' : 'Most popular models from the community'}
          </p>
          <div className="ml-[42px] mt-2 h-0.5 w-16 bg-gradient-to-r from-primary/60 to-transparent rounded-full" />
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => scroll('left')}
            className="w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/20 flex items-center justify-center text-primary/70 hover:text-primary transition-all duration-200"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/20 flex items-center justify-center text-primary/70 hover:text-primary transition-all duration-200"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable cards */}
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1 snap-x snap-mandatory ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {trending.map((product, i) => {
          const images = (product.images as string[]) || [];
          const name = language === 'es' ? product.name_es : product.name_en;
          const isTop3 = i < 3;
          const RankIcon = rankIcons[i] || null;

          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="shrink-0 w-[240px] sm:w-[280px] snap-start"
              style={{ perspective: '1000px' }}
            >
              <Link
                to={`/3dmodels/${product.slug}`}
                className="group block"
                onClick={e => { if (isDragging) e.preventDefault(); }}
                draggable={false}
              >
                <div className={`rounded-2xl overflow-hidden transition-all duration-500 border ${isTop3 ? 'border-primary/40 shadow-[0_0_20px_rgba(212,160,23,0.12)]' : 'border-border/40'} bg-card group-hover:border-primary/50 group-hover:shadow-[0_0_30px_rgba(212,160,23,0.15)] group-hover:[transform:perspective(1000px)_rotateY(-3deg)_scale(1.02)]`}>
                  {/* Image area */}
                  <div className="aspect-[3/4] relative overflow-hidden">
                    {images.length > 0 ? (
                      <img
                        src={images[0]}
                        alt={name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        loading="lazy"
                        draggable={false}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-secondary">
                        <Box className="w-12 h-12 text-muted-foreground/20" />
                      </div>
                    )}

                    {/* Dark gradient overlay at bottom */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Rank badge */}
                    <div className="absolute top-2.5 left-2.5">
                      {isTop3 ? (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-primary to-gold-light shadow-[0_0_12px_rgba(212,160,23,0.4)]">
                          {RankIcon && <RankIcon className="w-3.5 h-3.5 text-primary-foreground" />}
                          <span className="text-[11px] font-black text-primary-foreground">
                            #{i + 1}
                          </span>
                          {/* Shimmer effect */}
                          <div className="absolute inset-0 rounded-full overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite] -translate-x-full" style={{ animation: 'shimmer 2.5s infinite' }} />
                          </div>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-muted/80 backdrop-blur-sm text-[11px] font-bold text-muted-foreground border border-border/50">
                          #{i + 1}
                        </span>
                      )}
                    </div>

                    {/* Like button */}
                    <div className="absolute top-2.5 right-2.5">
                      <LikeButton productId={product.id} countOnly externalCount={likeCounts[product.id] || 0} size="sm" />
                    </div>

                    {/* Name + price overlay on image */}
                    <div className="absolute bottom-0 left-0 right-0 p-3.5">
                      <h3 className="font-display font-bold text-sm sm:text-base text-white truncate group-hover:text-primary transition-colors duration-300 drop-shadow-lg">
                        {name}
                      </h3>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-base sm:text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-gold-light drop-shadow-lg">
                          ${Number(product.base_price).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-white/60 font-medium">
                          {likeCounts[product.id] || 0} {language === 'es' ? 'likes' : 'likes'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Shimmer keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
