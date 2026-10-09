import { describe, expect, it } from 'vitest';
import { getOrderStatusUpdate, getPaymentStatusFromEvents, makeArchiveUpdate } from './order-operations';

describe('order operation helpers', () => {
  it('returns a lifecycle status update only when the target differs', () => {
    expect(getOrderStatusUpdate('pending', 'confirmed')).toEqual({ status: 'confirmed' });
    expect(getOrderStatusUpdate('pending', 'pending')).toBeNull();
  });

  it('derives payment state from the latest payment event without affecting lifecycle status', () => {
    expect(getPaymentStatusFromEvents([
      { event_type: 'received', created_at: '2026-10-02T12:00:00.000Z' },
      { event_type: 'proof_uploaded', created_at: '2026-10-03T12:00:00.000Z' },
    ])).toBe('submitted');
    expect(getPaymentStatusFromEvents([])).toBe('pending');
    expect(getPaymentStatusFromEvents([], 'rejected')).toBe('rejected');
  });

  it('creates reversible archive metadata updates', () => {
    expect(makeArchiveUpdate(true, 'admin-1', new Date('2026-10-09T12:00:00.000Z'))).toEqual({
      archived_at: '2026-10-09T12:00:00.000Z',
      archived_by: 'admin-1',
    });
    expect(makeArchiveUpdate(false, 'admin-1')).toEqual({ archived_at: null, archived_by: null });
  });
});
