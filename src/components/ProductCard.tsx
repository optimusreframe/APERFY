import { Link } from 'react-router-dom';
import { Heart, Box } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import LikeButton from '@/components/LikeButton';
import FavoriteCount from '@/components/FavoriteCount';
import ShareMenu from '@/components/ShareMenu';
import { Badge } from '@/components/ui/badge';
import { getInventoryLabel, getInventoryState } from '@/lib/inventory';
import { buildResponsiveImageSources, optimizeImageUrl } from '@/lib/image-url';
import type { Category, Product } from '@/lib/model-types';

export type ProductCardProduct = Product & { categories?: Pick<Category, 'name_en' | 'name_es'> | null };

interface ProductCardProps {
  product: ProductCardProduct;
  index?: number;
  likeCount?: number;
  favCount?: number;
  isFavorite?: boolean;
  onToggleFavorite?: (productId: string) => void;
  showBadges?: boolean;
}

export default function ProductCard({
  product,
  index = 0,
  likeCount = 0,
  favCount = 0,
  isFavorite = false,
  onToggleFavorite,
  showBadges = true,
}: ProductCardProps) {
  const { language } = useLanguage();
  const images = Array.isArray(product.images) ? product.images.filter((image): image is string => typeof image === 'string') : [];
  const name = language === 'es' ? product.name_es : product.name_en;
  const inventoryState = getInventoryState(product);
  const inventoryLabel = inventoryState === 'untracked'
    ? null
    : getInventoryLabel(inventoryState, product.stock_quantity, language === 'es' ? 'es' : 'en');

  // Check if product is new (less than 7 days old)
  const isNew = showBadges && (Date.now() - new Date(product.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000;
  const isTrending = showBadges && likeCount >= 5;

  const imageSource = images[0] ? optimizeImageUrl(images[0], { width: 640, quality: 74 }) : '';
  const imageSources = images[0] ? buildResponsiveImageSources(images[0], [320, 480, 640], 74) : undefined;

  return (
    <div className="group catalog-product-card">
      <div className="relative rounded-2xl bg-card border border-border/50 overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-gold">
        <Link to={`/products/${product.slug}`}>
          <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
            {images.length > 0 ? (
              <img
                src={imageSource}
                srcSet={imageSources}
                sizes="(max-width: 639px) calc((100vw - 36px) / 2), (max-width: 1023px) 30vw, 240px"
                alt={name}
                width={640}
                height={480}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                loading={index < 4 ? 'eager' : 'lazy'}
                fetchPriority={index < 4 ? 'high' : 'low'}
                decoding="async"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Box className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/30" />
              </div>
            )}
            {/* Badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {isNew && (
                <Badge className="bg-accent/90 text-accent-foreground border-0 text-[10px] px-1.5 py-0">NEW</Badge>
              )}
              {isTrending && (
                <Badge className="bg-primary/90 text-primary-foreground border-0 text-[10px] px-1.5 py-0">🔥 HOT</Badge>
              )}
            </div>
            {/* Category tag */}
            {product.categories && (
              <div className="absolute bottom-2 left-2 rounded-md bg-background/90 px-2 py-0.5 text-[10px] font-medium text-foreground sm:text-xs">
                {language === 'es' ? product.categories.name_es : product.categories.name_en}
              </div>
            )}
          </div>
        </Link>
        {/* Hover actions */}
        <div className="absolute top-2 right-2 flex flex-col gap-1.5">
          {onToggleFavorite && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(product.id); }}
              className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/20"
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-primary text-primary' : 'text-foreground'}`} />
            </button>
          )}
          <div className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <ShareMenu slug={product.slug} productName={name} />
          </div>
        </div>
        {/* Card info */}
        <div className="p-3">
          <Link to={`/products/${product.slug}`}>
            <h3 className="font-display font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
              {name}
            </h3>
          </Link>
          <div className="flex items-center justify-between mt-1">
            <span className="text-base sm:text-lg font-bold text-gradient-gold">
              ${Number(product.base_price).toFixed(2)}
            </span>
          </div>
          {inventoryLabel && (
            <div className={`mt-1 text-[10px] font-mono uppercase tracking-wider ${
              inventoryState === 'sold_out' ? 'text-destructive' : inventoryState === 'low' ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {inventoryLabel}
            </div>
          )}
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/30">
            <LikeButton productId={product.id} countOnly externalCount={likeCount} size="sm" />
            <FavoriteCount count={favCount} />
          </div>
        </div>
      </div>
    </div>
  );
}
