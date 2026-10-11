import { Box } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useRegionalPricing } from '@/contexts/RegionalPricingContext';
import LikeButton from '@/components/LikeButton';
import ShareMenu from '@/components/ShareMenu';
import { getInventoryLabel, getInventoryState } from '@/lib/inventory';
import { optimizeImageUrl } from '@/lib/image-url';
import type { ProductCardProduct } from '@/components/ProductCard';
import { formatRegionalPrice } from '@/lib/regional-pricing';

export type StorefrontTileVariant = 'tech' | 'luxury' | 'drops';

interface StorefrontProductTileProps {
  product: ProductCardProduct;
  variant: StorefrontTileVariant;
  index?: number;
}

export default function StorefrontProductTile({ product, variant, index = 0 }: StorefrontProductTileProps) {
  const { language } = useLanguage();
  const { pricing, currency } = useRegionalPricing();
  const name = language === 'es' ? product.name_es : product.name_en;
  const category = product.categories ? (language === 'es' ? product.categories.name_es : product.categories.name_en) : '';
  const images = Array.isArray(product.images) ? product.images.filter((image): image is string => typeof image === 'string') : [];
  const image = images[0];
  const condition = product.condition_status === 'used' ? 'USED' : 'NEW';
  const inventoryState = getInventoryState(product);
  const inventoryLabel = inventoryState === 'untracked' ? null : getInventoryLabel(inventoryState, product.stock_quantity, language === 'es' ? 'es' : 'en');
  const price = formatRegionalPrice(Number(product.base_price), pricing, currency);

  return (
    <article className={`storefront-tile storefront-tile-${variant} group`}>
      <Link to={`/products/${product.slug}`} className="block min-w-0" aria-label={name}>
        <div className="storefront-tile-media">
          {image ? (
            <img
              src={optimizeImageUrl(image, { width: variant === 'luxury' ? 960 : 640, quality: 78 })}
              alt={name}
              width={960}
              height={960}
              loading={index < 4 ? 'eager' : 'lazy'}
              decoding="async"
            />
          ) : <Box className="h-12 w-12 text-muted-foreground/30" />}
          <span className="storefront-tile-condition">{condition}</span>
          {category && <span className="storefront-tile-category">{category}</span>}
        </div>
        <div className="storefront-tile-copy">
          {product.brand && <p className="storefront-tile-brand">{product.brand}</p>}
          <h3>{name}</h3>
          <div className="storefront-tile-price-row">
            <span className="storefront-tile-price">{price}</span>
            {inventoryLabel && <span className={`storefront-tile-stock storefront-tile-stock-${inventoryState}`}>{inventoryLabel}</span>}
          </div>
        </div>
      </Link>
      <div className="storefront-tile-actions">
        <LikeButton productId={product.id} countOnly size="sm" />
        <ShareMenu slug={product.slug} productName={name} className="storefront-tile-share" />
      </div>
      <span className="storefront-tile-favorite" aria-hidden="true" />
    </article>
  );
}
