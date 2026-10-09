export interface FinanceOrder {
  id: string;
  total: number;
  status: string;
  payment_status: string;
  payment_method: string | null;
  created_at: string;
  archived_at: string | null;
}

export interface FinancePaymentEvent {
  id: string;
  order_id: string;
  event_type: string;
  amount: number;
  currency: string;
  provider: string;
  payment_method: string | null;
  occurred_at: string;
  created_at: string;
}

export interface FinanceMoneyTotal {
  currency: string;
  amount: number;
  orderCount: number;
}

export interface FinanceSummary {
  sales: FinanceMoneyTotal[];
  received: FinanceMoneyTotal[];
  pending: FinanceMoneyTotal[];
  submitted: FinanceMoneyTotal[];
  rejected: FinanceMoneyTotal[];
}

export interface FinanceActivity {
  id: string;
  orderId: string;
  type: string;
  amount: number;
  currency: string;
  provider: string;
  paymentMethod: string | null;
  occurredAt: string;
}

const normalizeCurrency = (currency: string | null | undefined) => {
  const normalized = currency?.trim().toUpperCase();
  return normalized && /^[A-Z]{3}$/.test(normalized) ? normalized : 'USD';
};

const eventTime = (event: FinancePaymentEvent) => {
  const timestamp = Date.parse(event.occurred_at || event.created_at);
  return Number.isFinite(timestamp) ? timestamp : 0;
};

function latestEventByOrder(events: FinancePaymentEvent[]) {
  const latest = new Map<string, FinancePaymentEvent>();
  for (const event of events) {
    const current = latest.get(event.order_id);
    if (!current || eventTime(event) > eventTime(current)) latest.set(event.order_id, event);
  }
  return latest;
}

function orderCurrency(order: FinanceOrder, latestEvents: Map<string, FinancePaymentEvent>) {
  return normalizeCurrency(latestEvents.get(order.id)?.currency);
}

function summarizeByCurrency(entries: Array<{ currency: string; amount: number }>): FinanceMoneyTotal[] {
  const totals = new Map<string, FinanceMoneyTotal>();
  for (const entry of entries) {
    const current = totals.get(entry.currency) ?? { currency: entry.currency, amount: 0, orderCount: 0 };
    current.amount += Number.isFinite(entry.amount) ? entry.amount : 0;
    current.orderCount += 1;
    totals.set(entry.currency, current);
  }
  return [...totals.values()]
    .map((total) => ({ ...total, amount: Math.round((total.amount + Number.EPSILON) * 100) / 100 }))
    .sort((left, right) => left.currency.localeCompare(right.currency));
}

export function deriveFinanceSummary(orders: FinanceOrder[], events: FinancePaymentEvent[]): FinanceSummary {
  const latestEvents = latestEventByOrder(events);
  const amountsByStatus: Record<'received' | 'pending' | 'submitted' | 'rejected', Array<{ currency: string; amount: number }>> = {
    received: [],
    pending: [],
    submitted: [],
    rejected: [],
  };
  const sales: Array<{ currency: string; amount: number }> = [];

  for (const order of orders) {
    const amount = Number(order.total);
    if (!Number.isFinite(amount)) continue;
    const currency = orderCurrency(order, latestEvents);
    if (order.status !== 'cancelled') sales.push({ currency, amount });
    if (order.payment_status in amountsByStatus) {
      amountsByStatus[order.payment_status as keyof typeof amountsByStatus].push({ currency, amount });
    }
  }

  return {
    sales: summarizeByCurrency(sales),
    received: summarizeByCurrency(amountsByStatus.received),
    pending: summarizeByCurrency(amountsByStatus.pending),
    submitted: summarizeByCurrency(amountsByStatus.submitted),
    rejected: summarizeByCurrency(amountsByStatus.rejected),
  };
}

export function buildFinanceActivity(
  orders: FinanceOrder[],
  events: FinancePaymentEvent[],
  limit = 20,
): FinanceActivity[] {
  const latestEvents = latestEventByOrder(events);
  const ordersById = new Map(orders.map((order) => [order.id, order]));
  const activity: FinanceActivity[] = orders.map((order) => {
    const latestEvent = latestEvents.get(order.id);
    return {
      id: `order-${order.id}`,
      orderId: order.id,
      type: 'order_created',
      amount: Number(order.total) || 0,
      currency: orderCurrency(order, latestEvents),
      provider: latestEvent?.provider || order.payment_method || 'manual',
      paymentMethod: order.payment_method || latestEvent?.payment_method || null,
      occurredAt: order.created_at,
    };
  });

  for (const event of events) {
    const order = ordersById.get(event.order_id);
    activity.push({
      id: `payment-${event.id}`,
      orderId: event.order_id,
      type: event.event_type,
      amount: Number(event.amount) || 0,
      currency: normalizeCurrency(event.currency),
      provider: event.provider || order?.payment_method || 'manual',
      paymentMethod: event.payment_method || order?.payment_method || null,
      occurredAt: event.occurred_at || event.created_at,
    });
  }

  return activity
    .sort((left, right) => {
      const difference = Date.parse(right.occurredAt) - Date.parse(left.occurredAt);
      return Number.isFinite(difference) ? difference : 0;
    })
    .slice(0, Math.max(0, limit));
}
