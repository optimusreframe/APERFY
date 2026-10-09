type ImageTransformOptions = {
  width: number;
  quality?: number;
};

const SUPABASE_PUBLIC_OBJECT_MARKER = '/storage/v1/object/public/';
const SUPABASE_RENDER_MARKER = '/storage/v1/render/image/public/';

/**
 * Converts a public Supabase image-transform URL back to its original public
 * storage URL. Cart state can outlive a previous UI version and may contain a
 * rendered/cropped URL, so image consumers should be able to recover the
 * complete source before applying a new responsive transform.
 */
export function getOriginalImageUrl(source: string): string {
  if (!source || source.startsWith('data:') || source.startsWith('blob:')) return source;

  try {
    const url = new URL(source);
    const markerIndex = url.pathname.indexOf(SUPABASE_RENDER_MARKER);
    if (markerIndex === -1) return source;

    const path = url.pathname.slice(markerIndex + SUPABASE_RENDER_MARKER.length);
    return `${url.origin}${SUPABASE_PUBLIC_OBJECT_MARKER}${path}`;
  } catch {
    return source;
  }
}

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
 * Returns a CDN-transformed WebP for public Supabase Storage objects while
 * preserving the source aspect ratio. Existing Supabase render URLs are
 * normalized to their original public object before creating the transform.
 * Non-Supabase, data, and blob URLs are left untouched.
 */
export function optimizeImageUrl(source: string, { width, quality = 78 }: ImageTransformOptions): string {
  const originalSource = getOriginalImageUrl(source);

  if (!originalSource || originalSource.startsWith('data:') || originalSource.startsWith('blob:')) {
    return originalSource;
  }

  if (source.includes(SUPABASE_RENDER_MARKER) && originalSource === source) {
    return source;
  }

  const object = getSupabasePublicObjectPath(originalSource);
  if (!object || !Number.isFinite(width) || width <= 0) return originalSource;

  const transformed = new URL(`${object.origin}${SUPABASE_RENDER_MARKER}${object.path}`);
  transformed.searchParams.set('width', String(Math.round(width)));
  transformed.searchParams.set('quality', String(Math.max(1, Math.min(100, Math.round(quality)))));
  transformed.searchParams.set('format', 'webp');
  transformed.searchParams.set('resize', 'contain');
  return transformed.toString();
}

export function buildResponsiveImageSources(source: string, widths: number[], quality = 78): string | undefined {
  const optimized = optimizeImageUrl(source, { width: widths[0] ?? 0, quality });
  if (optimized === source || widths.length === 0) return undefined;

  return widths
    .map(width => `${optimizeImageUrl(source, { width, quality })} ${width}w`)
    .join(', ');
}
