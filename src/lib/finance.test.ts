import { describe, expect, it } from 'vitest';
import { buildFinanceActivity, deriveFinanceSummary } from './finance';
import type { FinanceOrder, FinancePaymentEvent } from './finance';

const order = (overrides: Partial<FinanceOrder> = {}): FinanceOrder => ({
  id: 'order-1',
  total: 100,
  status: 'confirmed',
  payment_status: 'pending',
  payment_method: 'zelle',
  created_at: '2026-10-01T12:00:00.000Z',
  archived_at: null,
  ...overrides,
});

const event = (overrides: Partial<FinancePaymentEvent> = {}): FinancePaymentEvent => ({
  id: 'event-1',
  order_id: 'order-1',
  event_type: 'received',
  amount: 100,
  currency: 'USD',
  provider: 'zelle',
  payment_method: 'zelle',
  occurred_at: '2026-10-02T12:00:00.000Z',
  created_at: '2026-10-02T12:00:00.000Z',
  ...overrides,
});

describe('finance aggregation', () => {
  it('derives each amount once from current orders and excludes cancelled orders from sales', () => {
    const orders = [
      order({ id: 'received', total: 100, payment_status: 'received' }),
      order({ id: 'submitted', total: 50, payment_status: 'submitted', archived_at: '2026-10-05T12:00:00.000Z' }),
      order({ id: 'pending', total: 20, payment_status: 'pending', payment_method: 'whatsapp' }),
      order({ id: 'rejected', total: 30, payment_status: 'rejected' }),
      order({ id: 'cancelled', total: 400, status: 'cancelled', payment_status: 'pending' }),
    ];
    const events = [
      event({ id: 'received-1', order_id: 'received', occurred_at: '2026-10-02T12:00:00.000Z' }),
      event({ id: 'received-2', order_id: 'received', occurred_at: '2026-10-03T12:00:00.000Z' }),
      event({ id: 'proof', order_id: 'submitted', event_type: 'proof_uploaded' }),
      event({ id: 'rejection', order_id: 'rejected', event_type: 'rejected', amount: 30, currency: 'EUR', provider: 'manual' }),
      event({ id: 'cancelled-currency', order_id: 'cancelled', event_type: 'proof_uploaded', amount: 400, currency: 'CAD' }),
    ];

    expect(deriveFinanceSummary(orders, events)).toEqual({
      sales: [
        { currency: 'EUR', amount: 30, orderCount: 1 },
        { currency: 'USD', amount: 170, orderCount: 3 },
      ],
      received: [{ currency: 'USD', amount: 100, orderCount: 1 }],
      pending: [{ currency: 'CAD', amount: 400, orderCount: 1 }, { currency: 'USD', amount: 20, orderCount: 1 }],
      submitted: [{ currency: 'USD', amount: 50, orderCount: 1 }],
      rejected: [{ currency: 'EUR', amount: 30, orderCount: 1 }],
    });
  });

  it('merges order and payment activity with currency and provider metadata', () => {
    const orders = [order({ id: 'order-1', total: 100, payment_status: 'received' })];
    const events = [event({ provider: 'paypal', payment_method: 'card', currency: 'USD' })];

    expect(buildFinanceActivity(orders, events)).toEqual([
      expect.objectContaining({
        id: 'payment-event-1',
        orderId: 'order-1',
        type: 'received',
        amount: 100,
        currency: 'USD',
        provider: 'paypal',
        paymentMethod: 'card',
        occurredAt: '2026-10-02T12:00:00.000Z',
      }),
      expect.objectContaining({
        id: 'order-order-1',
        orderId: 'order-1',
        type: 'order_created',
        provider: 'paypal',
        paymentMethod: 'zelle',
        occurredAt: '2026-10-01T12:00:00.000Z',
      }),
    ]);
  });
});
