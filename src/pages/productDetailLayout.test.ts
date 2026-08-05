import { describe, expect, it } from 'vitest';
import { productCommandBarClassName } from './productDetailLayout';

describe('product detail command bar', () => {
  it('stays in document flow so product content never slides underneath it', () => {
    expect(productCommandBarClassName).not.toContain('sticky');
    expect(productCommandBarClassName).not.toContain('fixed');
    expect(productCommandBarClassName).toContain('relative');
  });
});
