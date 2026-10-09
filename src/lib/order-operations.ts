import type { Database } from '@/integrations/supabase/types';

export type OrderStatus = Database['public']['Enums']['order_status'];
export type PaymentStatus = 'pending' | 'submitted' | 'received' | 'rejected';

export type PaymentEventSummary = {
  event_type: string;
  created_at: string;
};

export function getOrderStatusUpdate(current: OrderStatus, next: OrderStatus) {
  return current === next ? null : { status: next };
}

export function getPaymentStatusFromEvents(
  events: readonly PaymentEventSummary[],
  fallback: PaymentStatus = 'pending',
): PaymentStatus {
  const latest = events.reduce<PaymentEventSummary | null>((current, event) => {
    if (!current || event.created_at > current.created_at) return event;
    return current;
  }, null);

  if (!latest) return fallback;
  if (latest.event_type === 'proof_uploaded') return 'submitted';
  if (latest.event_type === 'received' || latest.event_type === 'rejected' || latest.event_type === 'pending') {
    return latest.event_type;
  }
  return fallback;
}

export function makeArchiveUpdate(archive: boolean, actorId: string | null, at = new Date()) {
  return archive
    ? { archived_at: at.toISOString(), archived_by: actorId }
    : { archived_at: null, archived_by: null };
}
