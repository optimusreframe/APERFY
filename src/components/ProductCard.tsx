import { Link } from 'react-router-dom';
import { Heart, Box, Flame } from 'lucide-react';
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
import { isProductVideo } from '@/lib/product-media';
import type { Category, Product } from '@/lib/model-types';

export type ProductCardProduct = Product & { categories?: Pick<Category, 'name_en' | 'name_es'> | null };

interface ProductCardProps {
  product: ProductCardProduct;
  index?: number;
  layout?: 'grid' | 'list';
  likeCount?: number;
  favCount?: number;
  isFavorite?: boolean;
  onToggleFavorite?: (productId: string) => void;
  showBadges?: boolean;
}

export default function ProductCard({
  product,
  index = 0,
  layout = 'grid',
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

  const condition = product.condition_status === 'used' ? 'used' : 'new';
  const isTrending = showBadges && likeCount >= 5;
  const isList = layout === 'list';

  const imageSource = images[0] ? optimizeImageUrl(images[0], { width: 640, quality: 74 }) : '';
  const imageSources = images[0] ? buildResponsiveImageSources(images[0], [320, 480, 640], 74) : undefined;

  return (
    <div className={`group catalog-product-card min-w-0 [content-visibility:auto] [contain-intrinsic-size:420px] ${isList ? 'min-h-40' : ''}`}>
      <div className={`relative overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-gold ${isList ? 'flex items-stretch' : ''}`}>
        <Link to={`/products/${product.slug}`} className={`block ${isList ? 'w-36 shrink-0 sm:w-48' : ''}`} aria-label={name}>
          <div className={`relative h-full bg-secondary ${isList ? 'aspect-square' : 'aspect-[4/3]'} overflow-hidden`}>
            {images.length > 0 ? isProductVideo(images[0]) ? (
              <video
                src={images[0]}
                aria-label={name}
                className={`h-full w-full transition-transform duration-300 group-hover:scale-[1.03] ${isList ? 'object-contain p-2 sm:p-3' : 'object-cover'}`}
                muted
                loop
                autoPlay
                playsInline
                preload={index < 4 ? 'metadata' : 'none'}
              />
            ) : (
              <img
                src={imageSource}
                srcSet={imageSources}
                sizes={isList ? '(max-width: 639px) 144px, 192px' : '(max-width: 639px) calc((100vw - 36px) / 2), (max-width: 1023px) 30vw, 240px'}
                alt={name}
                width={640}
                height={480}
                className={`h-full w-full transition-transform duration-300 group-hover:scale-[1.03] ${isList ? 'object-contain p-2 sm:p-3' : 'object-cover'}`}
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
              {showBadges && (
                <Badge className={`border-0 text-[10px] px-1.5 py-0 font-bold ${condition === 'used' ? 'bg-amber-400/95 text-amber-950' : 'bg-accent/90 text-accent-foreground'}`}>
                  {condition === 'used' ? 'USED' : 'NEW'}
                </Badge>
              )}
              {isTrending && (
                <Badge className="inline-flex items-center gap-1 border-0 bg-primary/90 px-1.5 py-0 text-[10px] text-primary-foreground"><Flame className="h-3 w-3" aria-hidden="true" />HOT</Badge>
              )}
            </div>
            {/* Category tag */}
            {product.categories && (
              <div className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-md bg-background/90 px-2 py-0.5 text-[10px] font-medium text-foreground sm:text-xs">
                {language === 'es' ? product.categories.name_es : product.categories.name_en}
              </div>
            )}
          </div>
        </Link>
        {/* Secondary actions stay outside the navigation link so touch targets never hijack card taps. */}
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5">
          {onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(product.id); }}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-background/80 opacity-100 backdrop-blur-sm transition-opacity hover:bg-primary/20 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100"
              aria-label={isFavorite ? `Quitar ${name} de favoritos` : `Agregar ${name} a favoritos`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-primary text-primary' : 'text-foreground'}`} />
            </button>
          )}
          <ShareMenu
            slug={product.slug}
            productName={name}
            className="catalog-share-button min-h-11 min-w-11 rounded-full border border-border/70 bg-background/60 text-foreground/80 shadow-sm backdrop-blur-md transition-colors hover:border-primary/40 hover:bg-background/85 hover:text-primary"
          />
        </div>
        {/* Card info */}
        <div className={isList ? 'min-w-0 flex-1 p-3 pr-14 sm:p-4 sm:pr-16' : 'p-3'}>
          <Link to={`/products/${product.slug}`} className="block min-w-0">
            <h3 className={`font-display font-semibold text-sm text-foreground transition-colors group-hover:text-primary sm:text-base ${isList ? 'line-clamp-2' : 'truncate'}`}>
              {name}
            </h3>
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
          </Link>
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/30">
            <LikeButton productId={product.id} countOnly externalCount={likeCount} size="sm" />
            <FavoriteCount count={favCount} />
          </div>
        </div>
      </div>
    </div>
  );
}
