import { describe, expect, it } from 'vitest';
import { adjustProductImageZoom, isProductImageTap, PRODUCT_IMAGE_ZOOM } from './productImageZoom';

describe('product image zoom controls', () => {
  it('never zooms out below the original size', () => {
    expect(adjustProductImageZoom(1, -PRODUCT_IMAGE_ZOOM.step)).toBe(1);
    expect(adjustProductImageZoom(1.5, -PRODUCT_IMAGE_ZOOM.step)).toBe(1);
  });

  it('caps zoom in at the maximum supported scale', () => {
    expect(adjustProductImageZoom(5, PRODUCT_IMAGE_ZOOM.step)).toBe(5);
  });

  it('supports stepping back from an enlarged image', () => {
    expect(adjustProductImageZoom(2, -PRODUCT_IMAGE_ZOOM.step)).toBe(1.5);
  });

  it('recognizes a tap without mistaking a pan for a tap', () => {
    expect(isProductImageTap(100, 100, 104, 103, 180)).toBe(true);
    expect(isProductImageTap(100, 100, 140, 103, 180)).toBe(false);
    expect(isProductImageTap(100, 100, 104, 103, 600)).toBe(false);
  });
});
