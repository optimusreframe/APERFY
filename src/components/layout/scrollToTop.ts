export const SCROLL_TO_TOP_THRESHOLD = 360;

export function shouldShowScrollToTop(scrollTop: number): boolean {
  return scrollTop >= SCROLL_TO_TOP_THRESHOLD;
}
