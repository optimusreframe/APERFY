import type { Dispatch, SetStateAction } from 'react';
import { ArrowLeft, ArrowRight, Heart, Minus, Plus, ShoppingBag, Share2, Sparkles, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { optimizeImageUrl } from '@/lib/image-url';
import { isProductVideo } from '@/lib/product-media';
import type { Category, Product } from '@/lib/model-types';
import type { Database } from '@/integrations/supabase/types';
import type { StorefrontDesign } from '@/lib/storefront-layout';

type Variation = Database['public']['Tables']['product_variations']['Row'];
type StorefrontProduct = Product & { categories: Pick<Category, 'name_en' | 'name_es'> | null };

interface PresetProductDetailProps {
  design: StorefrontDesign;
  product: StorefrontProduct;
  language: 'en' | 'es';
  images: string[];
  selectedImage: number;
  setSelectedImage: Dispatch<SetStateAction<number>>;
  openLightbox: () => void;
  isFavorite: boolean;
  toggleFavorite: () => void;
  description: string;
  variations: Variation[];
  variationsByType: Record<string, Variation[]>;
  selectedVariations: Record<string, string>;
  setSelectedVariations: Dispatch<SetStateAction<Record<string, string>>>;
  inventoryState: string;
  inventoryLabel: string;
  quantity: number;
  setQuantity: Dispatch<SetStateAction<number>>;
  quantityLimit: number;
  handleAddToCart: () => void;
  needsVariation: boolean;
  displayTotalPrice: string;
  notes: string;
  setNotes: Dispatch<SetStateAction<string>>;
}

function ProductGallery({ product, images, selectedImage, setSelectedImage, openLightbox, compact = false }: { product: StorefrontProduct; images: string[]; selectedImage: number; setSelectedImage: Dispatch<SetStateAction<number>>; openLightbox: () => void; compact?: boolean }) {
  const image = images[selectedImage] || images[0];
  return (
    <div className={`preset-product-gallery ${compact ? 'is-compact' : ''}`}>
      <button type="button" className="preset-product-main-image" onClick={openLightbox} aria-label="Zoom product image">
        {image ? isProductVideo(image) ? <video src={image} aria-label={product.name_en} autoPlay muted loop playsInline /> : <img src={optimizeImageUrl(image, { width: 1200, quality: 80 })} alt={product.name_en} /> : <Sparkles className="h-12 w-12 text-primary/45" />}
        {images.length > 1 && <span className="preset-product-image-count">{String(selectedImage + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}</span>}
      </button>
      {images.length > 1 && <div className="preset-product-thumbnails">{images.map((item, index) => <button type="button" key={`${item}-${index}`} onClick={() => setSelectedImage(index)} className={index === selectedImage ? 'is-selected' : ''}><img src={optimizeImageUrl(item, { width: 160, quality: 72 })} alt="" /></button>)}</div>}
    </div>
  );
}

function ProductIdentity({ product, language, compact = false }: { product: StorefrontProduct; language: 'en' | 'es'; compact?: boolean }) {
  const name = language === 'es' ? product.name_es : product.name_en;
  const category = product.categories ? (language === 'es' ? product.categories.name_es : product.categories.name_en) : '';
  return <div className={`preset-product-identity ${compact ? 'is-compact' : ''}`}><div className="preset-product-kicker">{category || 'APERFY'}<span>{product.condition_status === 'used' ? 'USED' : 'NEW'}</span></div><h1>{name}</h1>{product.brand && <p className="preset-product-brand">{product.brand}</p>}</div>;
}

function VariationSelector({ language, variationsByType, selectedVariations, setSelectedVariations }: Pick<PresetProductDetailProps, 'language' | 'variationsByType' | 'selectedVariations' | 'setSelectedVariations'>) {
  return <div className="preset-product-variations">{Object.entries(variationsByType).map(([type, options]) => <div key={type} className="preset-product-variation-group"><div><span>{type === 'color' ? (language === 'es' ? 'Color' : 'Color') : type === 'size' ? (language === 'es' ? 'Talla' : 'Size') : type}</span><b>{options.find((option) => option.id === selectedVariations[type]) ? (language === 'es' ? options.find((option) => option.id === selectedVariations[type])?.name_es : options.find((option) => option.id === selectedVariations[type])?.name_en) : (language === 'es' ? 'Seleccionar' : 'Select')}</b></div><div className="preset-product-option-row">{options.map((option) => { const selected = selectedVariations[type] === option.id; const label = language === 'es' ? option.name_es : option.name_en; return <button type="button" key={option.id} onClick={() => setSelectedVariations((current) => ({ ...current, [type]: option.id }))} className={selected ? 'is-selected' : ''}>{type === 'color' && <i style={{ backgroundColor: option.value || 'transparent' }} />}{label}{option.inventory_enabled && <small>{Number(option.stock_quantity || 0)}</small>}</button>; })}</div></div>)}</div>;
}

function QuantityAndAction({ language, quantity, setQuantity, quantityLimit, inventoryState, displayTotalPrice, handleAddToCart, needsVariation }: Pick<PresetProductDetailProps, 'language' | 'quantity' | 'setQuantity' | 'quantityLimit' | 'inventoryState' | 'displayTotalPrice' | 'handleAddToCart' | 'needsVariation'>) {
  const soldOut = inventoryState === 'sold_out';
  return <div className="preset-product-purchase"><div className="preset-product-quantity"><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label={language === 'es' ? 'Reducir cantidad' : 'Decrease quantity'}><Minus className="h-4 w-4" /></button><strong>{String(quantity).padStart(2, '0')}</strong><button type="button" onClick={() => setQuantity(Math.min(quantityLimit, quantity + 1))} disabled={quantity >= quantityLimit || soldOut} aria-label={language === 'es' ? 'Aumentar cantidad' : 'Increase quantity'}><Plus className="h-4 w-4" /></button></div><Button type="button" onClick={handleAddToCart} disabled={soldOut || needsVariation} className="preset-product-cta"><ShoppingBag className="h-4 w-4" />{language === 'es' ? 'Agregar al carrito' : 'Add to bag'}<span>{displayTotalPrice}</span></Button></div>;
}

export default function StorefrontProductDetailPreset(props: PresetProductDetailProps) {
  const { design, product, language, images, selectedImage, setSelectedImage, openLightbox, isFavorite, toggleFavorite, description, variations, variationsByType, selectedVariations, setSelectedVariations, inventoryState, inventoryLabel, quantity, setQuantity, quantityLimit, handleAddToCart, needsVariation, displayTotalPrice, notes, setNotes } = props;
  const category = product.categories ? (language === 'es' ? product.categories.name_es : product.categories.name_en) : '';
  const commonTop = <div className="preset-product-topbar"><Link to="/" aria-label={language === 'es' ? 'Volver a la tienda' : 'Back to store'}><ArrowLeft className="h-4 w-4" /></Link><span>{category || 'APERFY'}</span><div><button type="button" onClick={toggleFavorite} aria-label={language === 'es' ? 'Favorito' : 'Favorite'}><Heart className={isFavorite ? 'fill-primary text-primary' : ''} /></button><button type="button" aria-label={language === 'es' ? 'Compartir' : 'Share'}><Share2 /></button></div></div>;
  const details = <div className="preset-product-description"><p className="preset-product-section-label">{language === 'es' ? 'DESCRIPCIÓN' : 'DESCRIPTION'}</p><p>{description}</p>{product.allows_special_notes && <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder={language === 'es' ? 'Notas especiales para este producto...' : 'Special notes for this product...'} />}</div>;
  const controls = <><VariationSelector language={language} variationsByType={variationsByType} selectedVariations={selectedVariations} setSelectedVariations={setSelectedVariations} />{variations.length === 0 && <div className="preset-product-standard-option">{language === 'es' ? 'Edición estándar' : 'Standard edition'}</div>}<div className="preset-product-stock"><span className={`is-${inventoryState}`} />{inventoryLabel}</div><QuantityAndAction language={language} quantity={quantity} setQuantity={setQuantity} quantityLimit={quantityLimit} inventoryState={inventoryState} displayTotalPrice={displayTotalPrice} handleAddToCart={handleAddToCart} needsVariation={needsVariation} /></>;

  if (design === 'design2') return <main className="storefront-product-preset product-preset-design2">{commonTop}<div className="product-preset-tech-layout"><div><ProductIdentity product={product} language={language} /><ProductGallery product={product} images={images} selectedImage={selectedImage} setSelectedImage={setSelectedImage} openLightbox={openLightbox} /></div><aside className="product-preset-tech-info"><div className="preset-product-price">{displayTotalPrice}</div>{controls}{details}<div className="preset-product-benefit"><Truck className="h-4 w-4" /><span>{language === 'es' ? 'Envío rápido y stock verificado' : 'Fast delivery and verified stock'}</span></div></aside></div></main>;

  if (design === 'design3') return <main className="storefront-product-preset product-preset-design3">{commonTop}<ProductIdentity product={product} language={language} /><div className="product-preset-luxury-stage"><ProductGallery product={product} images={images} selectedImage={selectedImage} setSelectedImage={setSelectedImage} openLightbox={openLightbox} /><div className="product-preset-luxury-card"><div className="preset-product-price">{displayTotalPrice}</div>{controls}{details}</div></div></main>;

  return <main className="storefront-product-preset product-preset-design4">{commonTop}<div className="product-preset-drops-heading"><ProductIdentity product={product} language={language} compact /><span>{language === 'es' ? 'DETALLES DEL DROP' : 'DROP DETAILS'}</span></div><div className="product-preset-drops-layout"><ProductGallery product={product} images={images} selectedImage={selectedImage} setSelectedImage={setSelectedImage} openLightbox={openLightbox} compact /><aside className="product-preset-drops-info"><div className="preset-product-price">{displayTotalPrice}</div><div className="product-preset-stats"><span>{language === 'es' ? 'STOCK' : 'STOCK'}<b>{inventoryLabel}</b></span><span>{language === 'es' ? 'ENVÍO' : 'SHIPPING'}<b>3–7 DAYS</b></span><span>{language === 'es' ? 'MARCA' : 'BRAND'}<b>{product.brand || 'APERFY'}</b></span></div>{controls}{details}</aside></div></main>;
}
