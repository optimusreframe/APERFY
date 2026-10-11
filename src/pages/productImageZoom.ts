export const PRODUCT_IMAGE_ZOOM = {
  min: 1,
  max: 5,
  step: 0.5,
} as const;

export function clampProductImageZoom(value: number): number {
  return Math.min(PRODUCT_IMAGE_ZOOM.max, Math.max(PRODUCT_IMAGE_ZOOM.min, value));
}

export function adjustProductImageZoom(current: number, delta: number): number {
  return clampProductImageZoom(current + delta);
}

export function isProductImageTap(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  durationMs: number,
  movementThreshold = 12,
  maxDurationMs = 450,
): boolean {
  return Math.hypot(endX - startX, endY - startY) <= movementThreshold && durationMs <= maxDurationMs;
}
