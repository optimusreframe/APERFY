import { describe, expect, it } from 'vitest';
import { isDynamicImportError } from './lazyWithRetry';

describe('lazyWithRetry', () => {
  it('recognizes stale dynamic-import failures', () => {
    expect(isDynamicImportError(new TypeError('Failed to fetch dynamically imported module'))).toBe(true);
    expect(isDynamicImportError(new Error('Loading chunk cart failed'))).toBe(true);
    expect(isDynamicImportError(new Error('Validation failed'))).toBe(false);
  });
});
