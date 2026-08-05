import { describe, expect, it } from 'vitest';
import { shouldShowScrollToTop } from './scrollToTop';

describe('scroll to top visibility', () => {
  it('appears after the content has moved beyond the comfortable return distance', () => {
    expect(shouldShowScrollToTop(0)).toBe(false);
    expect(shouldShowScrollToTop(359)).toBe(false);
    expect(shouldShowScrollToTop(360)).toBe(true);
  });
});
