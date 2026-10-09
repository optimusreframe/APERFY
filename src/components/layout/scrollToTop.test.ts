import { describe, expect, it } from 'vitest';
import { getScrollToTopMobileBottom, shouldShowScrollToTop } from './scrollToTop';

describe('scroll to top visibility', () => {
  it('appears after the content has moved beyond the comfortable return distance', () => {
    expect(shouldShowScrollToTop(0)).toBe(false);
    expect(shouldShowScrollToTop(359)).toBe(false);
    expect(shouldShowScrollToTop(360)).toBe(true);
  });

  it('keeps the control above the mobile add-to-cart dock on product pages', () => {
    expect(getScrollToTopMobileBottom(false)).toContain('72px');
    expect(getScrollToTopMobileBottom(true)).toContain('132px');
    expect(getScrollToTopMobileBottom(true)).not.toBe(getScrollToTopMobileBottom(false));
  });
});
