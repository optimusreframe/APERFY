type ImageTransformOptions = {
  width: number;
  quality?: number;
};

const SUPABASE_PUBLIC_OBJECT_MARKER = '/storage/v1/object/public/';
const SUPABASE_RENDER_MARKER = '/storage/v1/render/image/public/';

function getSupabasePublicObjectPath(source: string): { origin: string; path: string } | null {
  try {
    const url = new URL(source);
    const markerIndex = url.pathname.indexOf(SUPABASE_PUBLIC_OBJECT_MARKER);
    if (markerIndex === -1) return null;

    return {
      origin: url.origin,
      path: url.pathname.slice(markerIndex + SUPABASE_PUBLIC_OBJECT_MARKER.length),
    };
  } catch {
    return null;
  }
}

/**
 * Returns a CDN-transformed WebP for public Supabase Storage objects.
 * Non-Supabase, data, blob, and already-transformed URLs are left untouched.
 */
export function optimizeImageUrl(source: string, { width, quality = 78 }: ImageTransformOptions): string {
  if (!source || source.startsWith('data:') || source.startsWith('blob:') || source.includes(SUPABASE_RENDER_MARKER)) {
    return source;
  }

  const object = getSupabasePublicObjectPath(source);
  if (!object || !Number.isFinite(width) || width <= 0) return source;

  const transformed = new URL(`${object.origin}${SUPABASE_RENDER_MARKER}${object.path}`);
  transformed.searchParams.set('width', String(Math.round(width)));
  transformed.searchParams.set('quality', String(Math.max(1, Math.min(100, Math.round(quality)))));
  transformed.searchParams.set('format', 'webp');
  return transformed.toString();
}

export function buildResponsiveImageSources(source: string, widths: number[], quality = 78): string | undefined {
  const optimized = optimizeImageUrl(source, { width: widths[0] ?? 0, quality });
  if (optimized === source || widths.length === 0) return undefined;

  return widths
    .map(width => `${optimizeImageUrl(source, { width, quality })} ${width}w`)
    .join(', ');
}
