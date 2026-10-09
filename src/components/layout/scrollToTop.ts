export const SCROLL_TO_TOP_THRESHOLD = 360;
export const MOBILE_BOTTOM_NAV_OFFSET = 'calc(env(safe-area-inset-bottom, 0px) + 64px)';
export const MOBILE_PRODUCT_DOCK_SCROLL_OFFSET = 'calc(env(safe-area-inset-bottom, 0px) + 64px + 64px + 12px)';

export function shouldShowScrollToTop(scrollTop: number): boolean {
  return scrollTop >= SCROLL_TO_TOP_THRESHOLD;
}

export function getScrollToTopMobileBottom(isProductDetail: boolean): string {
  return isProductDetail ? MOBILE_PRODUCT_DOCK_SCROLL_OFFSET : MOBILE_BOTTOM_NAV_OFFSET;
}
