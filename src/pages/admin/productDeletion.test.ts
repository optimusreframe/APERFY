import { describe, expect, it } from 'vitest';
import { partitionProductDeletion } from './productDeletion';

describe('safe product deletion', () => {
  it('keeps products referenced by order history and deletes the rest', () => {
    expect(partitionProductDeletion(['a', 'b', 'c'], ['b'])).toEqual({
      deleteIds: ['a', 'c'],
      archiveIds: ['b'],
    });
  });
});
