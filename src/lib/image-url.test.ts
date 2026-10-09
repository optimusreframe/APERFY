import { describe, expect, it } from 'vitest';
import { buildResponsiveImageSources, optimizeImageUrl } from './image-url';

const sourceImage = 'https://xftxyvgplghnelawkhvl.supabase.co/storage/v1/object/public/product-images/catalog/phone.jpg';

describe('image URL optimization', () => {
  it('uses Supabase image transformations for public storage objects', () => {
    expect(optimizeImageUrl(sourceImage, { width: 640, quality: 72 })).toBe(
      'https://xftxyvgplghnelawkhvl.supabase.co/storage/v1/render/image/public/product-images/catalog/phone.jpg?width=640&quality=72&format=webp',
    );
  });

  it('leaves external and data URLs untouched', () => {
    expect(optimizeImageUrl('https://cdn.example.com/phone.jpg', { width: 640 })).toBe('https://cdn.example.com/phone.jpg');
    expect(optimizeImageUrl('data:image/png;base64,abc', { width: 640 })).toBe('data:image/png;base64,abc');
  });

  it('builds a responsive source set only from transformable URLs', () => {
    expect(buildResponsiveImageSources(sourceImage, [320, 640], 72)).toBe(
      'https://xftxyvgplghnelawkhvl.supabase.co/storage/v1/render/image/public/product-images/catalog/phone.jpg?width=320&quality=72&format=webp 320w, https://xftxyvgplghnelawkhvl.supabase.co/storage/v1/render/image/public/product-images/catalog/phone.jpg?width=640&quality=72&format=webp 640w',
    );
    expect(buildResponsiveImageSources('https://cdn.example.com/phone.jpg', [320, 640], 72)).toBeUndefined();
  });
});
