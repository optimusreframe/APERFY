import { supabase } from '@/integrations/supabase/client';

export type ProductSize = 'small' | 'medium' | 'large';
export type VerticalPosition = 'lower' | 'center' | 'higher';
export type ShadowStrength = 'off' | 'soft' | 'strong';

export interface NonAiPlacement {
  productSize?: ProductSize;
  verticalPosition?: VerticalPosition;
  shadow?: ShadowStrength;
}

const SIZE_FRACTIONS: Record<ProductSize, number> = {
  small: 0.45,
  medium: 0.6,
  large: 0.78,
};

const VPOS_FRACTIONS: Record<VerticalPosition, number> = {
  higher: 0.42,
  center: 0.55,
  lower: 0.7,
};

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/**
 * Composite a product source image onto a background image via HTML canvas.
 * No AI model is used — this is a simple drawn composite for visual preview.
 * Returns a PNG Blob.
 */
export async function compositeNonAi(
  backgroundUrl: string,
  sourceUrl: string,
  placement: NonAiPlacement = {}
): Promise<Blob> {
  const size = placement.productSize ?? 'medium';
  const vpos = placement.verticalPosition ?? 'lower';
  const shadow = placement.shadow ?? 'soft';

  const [bg, src] = await Promise.all([loadImage(backgroundUrl), loadImage(sourceUrl)]);

  // Use the background's native dimensions for max quality
  const W = bg.naturalWidth || 1024;
  const H = bg.naturalHeight || 1024;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.drawImage(bg, 0, 0, W, H);

  // Compute product size while preserving source aspect ratio
  const targetW = W * SIZE_FRACTIONS[size];
  const srcRatio = (src.naturalWidth || 1) / (src.naturalHeight || 1);
  const targetH = targetW / srcRatio;
  const cx = W / 2;
  const cy = H * VPOS_FRACTIONS[vpos];
  const dx = cx - targetW / 2;
  const dy = cy - targetH / 2;

  if (shadow !== 'off') {
    ctx.save();
    const blur = shadow === 'strong' ? 40 : 22;
    const alpha = shadow === 'strong' ? 0.55 : 0.32;
    ctx.shadowColor = `rgba(0,0,0,${alpha})`;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = shadow === 'strong' ? 28 : 16;
    ctx.drawImage(src, dx, dy, targetW, targetH);
    ctx.restore();
  } else {
    ctx.drawImage(src, dx, dy, targetW, targetH);
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
      'image/png',
      0.95
    );
  });
}

export interface SaveComposedArgs {
  blob: Blob;
  sourceImageUrl: string;
  backgroundImageUrl: string;
  backgroundCandidateId?: string | null;
  preset?: string | null;
  productId?: string | null;
  method: 'non_ai';
}

/**
 * Uploads the composed Blob to product-images/composed-results/{uid}/...
 * and inserts a background_composition_results row. Admin-only by RLS.
 */
export async function saveNonAiComposite(args: SaveComposedArgs): Promise<{ url: string; id: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error('Not authenticated');

  const ts = Date.now();
  const slug = (args.preset || 'custom').replace(/[^a-zA-Z0-9_-]/g, '_');
  const path = `composed-results/${uid}/${ts}-${args.method}-${slug}-${Math.random().toString(36).slice(2, 8)}.png`;

  const { error: upErr } = await supabase.storage
    .from('product-images')
    .upload(path, args.blob, { contentType: 'image/png', upsert: false });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from('product-images').getPublicUrl(path);
  const url = pub.publicUrl;

  const { data: row, error: insErr } = await supabase
    .from('background_composition_results')
    .insert({
      source_image_url: args.sourceImageUrl,
      background_image_url: args.backgroundImageUrl,
      composed_image_url: url,
      background_candidate_id: args.backgroundCandidateId ?? null,
      method: args.method,
      preset: args.preset ?? null,
      product_id: args.productId ?? null,
      created_by: uid,
    })
    .select('id')
    .single();
  if (insErr) throw insErr;

  return { url, id: row.id };
}

/** Trigger a file download for a remote image URL. */
export async function downloadRemoteImage(url: string, filename: string): Promise<void> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed: HTTP ${resp.status}`);
  const blob = await resp.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
}

export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } finally { document.body.removeChild(ta); }
}
