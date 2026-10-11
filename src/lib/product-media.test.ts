import { describe, expect, it } from 'vitest';
import { getProductMediaKind, isProductVideo } from './product-media';

describe('product media detection', () => {
  it('detects video extensions with query strings', () => {
    expect(getProductMediaKind('https://cdn.example/video.mp4?token=1')).toBe('video');
    expect(isProductVideo('https://cdn.example/video.webm')).toBe(true);
  });

  it('keeps image and storage paths as image media', () => {
    expect(getProductMediaKind('https://cdn.example/product-image')).toBe('image');
    expect(isProductVideo('https://cdn.example/product.jpg')).toBe(false);
  });
});
