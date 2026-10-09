import { useEffect, useState, type ReactNode } from 'react';
import { getOriginalImageUrl, optimizeImageUrl } from '@/lib/image-url';

interface CartThumbnailImageProps {
  source: string;
  alt: string;
  width: number;
  height: number;
  quality?: number;
  className?: string;
  fallback: ReactNode;
}

/**
 * Displays a complete cart thumbnail and recovers from a stale/failed
 * Supabase image transform by retrying the original public URL once.
 */
export function CartThumbnailImage({
  source,
  alt,
  width,
  height,
  quality,
  className,
  fallback,
}: CartThumbnailImageProps) {
  const originalSource = getOriginalImageUrl(source);
  const optimizedSource = optimizeImageUrl(originalSource, { width, quality });
  const [src, setSrc] = useState(optimizedSource);
  const [failed, setFailed] = useState(!originalSource);

  useEffect(() => {
    setSrc(optimizedSource);
    setFailed(!originalSource);
  }, [optimizedSource, originalSource]);

  if (failed || !src) return <>{fallback}</>;

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      decoding="async"
      loading="lazy"
      className={className}
      onError={() => {
        if (src !== originalSource && originalSource) {
          setSrc(originalSource);
          return;
        }
        setFailed(true);
      }}
    />
  );
}
