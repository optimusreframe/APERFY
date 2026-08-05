import { describe, expect, it } from 'vitest';
import { toggleBulkSelection, toggleAllBulkSelection } from './productBulkSelection';

describe('bulk product selection', () => {
  it('adds and removes one product without changing the other selections', () => {
    expect(toggleBulkSelection(['a'], 'b', true)).toEqual(['a', 'b']);
    expect(toggleBulkSelection(['a', 'b'], 'a', false)).toEqual(['b']);
  });

  it('selects all visible products and clears them when toggled off', () => {
    expect(toggleAllBulkSelection([], ['a', 'b'], true)).toEqual(['a', 'b']);
    expect(toggleAllBulkSelection(['a', 'b'], ['a', 'b'], false)).toEqual([]);
  });
});
