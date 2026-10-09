import { describe, expect, it } from 'vitest';
import {
  getScrollToTopMobileBottom,
  MOBILE_BOTTOM_NAV_OFFSET,
  MOBILE_PRODUCT_DOCK_SCROLL_OFFSET,
  shouldShowScrollToTop,
} from './scrollToTop';

describe('scroll to top visibility', () => {
  it('appears after the content has moved beyond the comfortable return distance', () => {
    expect(shouldShowScrollToTop(0)).toBe(false);
    expect(shouldShowScrollToTop(359)).toBe(false);
    expect(shouldShowScrollToTop(360)).toBe(true);
  });

  it('keeps the control above the mobile add-to-cart dock on product pages', () => {
    expect(MOBILE_BOTTOM_NAV_OFFSET).toBe('calc(env(safe-area-inset-bottom, 0px) + 64px)');
    expect(MOBILE_PRODUCT_DOCK_SCROLL_OFFSET).toBe('calc(env(safe-area-inset-bottom, 0px) + 64px + 64px + 12px)');
    expect(getScrollToTopMobileBottom(false)).toBe(MOBILE_BOTTOM_NAV_OFFSET);
    expect(getScrollToTopMobileBottom(true)).toBe(MOBILE_PRODUCT_DOCK_SCROLL_OFFSET);
    expect(getScrollToTopMobileBottom(true)).not.toBe(getScrollToTopMobileBottom(false));
  });
});
