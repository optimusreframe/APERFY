import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowUpRight, CircleDollarSign, Clock3, CreditCard, RefreshCw, ShoppingBag, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { buildFinanceActivity, deriveFinanceSummary, type FinanceActivity, type FinanceMoneyTotal, type FinanceOrder, type FinancePaymentEvent } from '@/lib/finance';
import { AdminPageHeader, AdminSurface } from './_shared';

const FINANCE_PAGE_SIZE = 500;
const RECENT_ACTIVITY_LIMIT = 24;

async function loadFinanceOrders(): Promise<FinanceOrder[]> {
  const orders: FinanceOrder[] = [];
  for (let from = 0; ; from += FINANCE_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('orders')
      .select('id, total, status, payment_status, payment_method, created_at, archived_at')
      .order('created_at', { ascending: false })
      .range(from, from + FINANCE_PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as FinanceOrder[];
    orders.push(...page);
    if (page.length < FINANCE_PAGE_SIZE) return orders;
  }
}

async function loadFinancePaymentEvents(): Promise<FinancePaymentEvent[]> {
  const events: FinancePaymentEvent[] = [];
  for (let from = 0; ; from += FINANCE_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('payment_events')
      .select('id, order_id, event_type, amount, currency, provider, payment_method, occurred_at, created_at')
      .order('occurred_at', { ascending: false })
      .range(from, from + FINANCE_PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as FinancePaymentEvent[];
    events.push(...page);
    if (page.length < FINANCE_PAGE_SIZE) return events;
  }
}

async function loadFinanceData() {
  const [orders, paymentEvents] = await Promise.all([loadFinanceOrders(), loadFinancePaymentEvents()]);
  return {
    summary: deriveFinanceSummary(orders, paymentEvents),
    activity: buildFinanceActivity(orders, paymentEvents, RECENT_ACTIVITY_LIMIT),
  };
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

const activityLabels: Record<string, string> = {
  order_created: 'Order created',
  proof_uploaded: 'Payment proof submitted',
  received: 'Payment received',
  rejected: 'Payment rejected',
};

function ActivityLabel({ type }: { type: string }) {
  const label = activityLabels[type] ?? type.replace(/_/g, ' ');
  const color = type === 'received'
    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
    : type === 'rejected'
      ? 'border-red-500/25 bg-red-500/10 text-red-400'
      : type === 'proof_uploaded'
        ? 'border-blue-500/25 bg-blue-500/10 text-blue-400'
        : 'border-white/10 bg-white/[0.04] text-muted-foreground';
  return <span className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider ${color}`}>{label}</span>;
}

function FinanceStat({
  title,
  icon: Icon,
  totals,
  loading,
  accent,
}: {
  title: string;
  icon: LucideIcon;
  totals: FinanceMoneyTotal[];
  loading: boolean;
  accent?: boolean;
}) {
  const displayTotals = totals.length ? totals : [{ currency: 'USD', amount: 0, orderCount: 0 }];
  return (
    <AdminSurface className={`min-w-0 p-4 md:p-5 ${accent ? 'border-primary/25 bg-gradient-to-br from-primary/[0.12] to-[hsl(220_17%_12%/.72)]' : ''}`}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <h2 className="min-w-0 text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">{title}</h2>
        <Icon className={`h-4 w-4 shrink-0 ${accent ? 'text-primary' : 'text-muted-foreground/70'}`} strokeWidth={1.6} aria-hidden="true" />
      </div>
      <div className="mt-4 min-w-0 space-y-2">
        {loading
          ? <Skeleton className="h-8 w-28" />
          : displayTotals.map((total) => (
            <div key={total.currency} className="min-w-0">
              <div className="break-words font-display text-xl font-bold tracking-tight text-foreground tabular-nums md:text-2xl">
                {formatMoney(total.amount, total.currency)}
              </div>
              <div className="mt-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
                {total.orderCount} {total.orderCount === 1 ? 'order' : 'orders'} · {total.currency}
              </div>
            </div>
          ))}
      </div>
    </AdminSurface>
  );
}

function FinanceActivityRow({ item }: { item: FinanceActivity }) {
  const method = item.paymentMethod?.trim() || 'Payment method unavailable';
  const provider = item.provider?.trim() || 'Manual';
  return (
    <li className="grid min-w-0 gap-3 border-b border-white/[0.06] px-4 py-4 last:border-b-0 md:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0 space-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ActivityLabel type={item.type} />
          <Link
            to={`/admin/orders?order=${encodeURIComponent(item.orderId)}`}
            className="inline-flex min-h-11 max-w-full items-center gap-1 rounded-md px-2 text-xs font-mono font-semibold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Open order ${item.orderId}`}
          >
            #{item.orderId.slice(0, 8).toUpperCase()} <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </Link>
        </div>
        <p className="break-words text-[11px] leading-relaxed text-muted-foreground">
          <span className="text-foreground/80">{provider}</span>
          <span aria-hidden="true"> · </span>
          {method}
          <span aria-hidden="true"> · </span>
          {item.currency}
        </p>
      </div>
      <div className="min-w-0 lg:text-right">
        <p className="break-words font-mono text-sm font-semibold tabular-nums text-foreground">{formatMoney(item.amount, item.currency)}</p>
        <time className="mt-1 block break-words text-[10px] font-mono text-muted-foreground/70" dateTime={item.occurredAt}>{formatDate(item.occurredAt)}</time>
      </div>
    </li>
  );
}

export default function AdminFinance() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-finance'],
    queryFn: loadFinanceData,
    staleTime: 30_000,
  });

  if (isError) {
    return (
      <div className="mx-auto min-w-0 max-w-[1400px] space-y-6">
        <AdminPageHeader eyebrow="OPERATIONS · FINANCE" title="Finance" meta="ORDER AND PAYMENT ACTIVITY" />
        <AdminSurface className="mx-auto max-w-2xl p-0 text-center">
          <div role="alert" className="flex flex-col items-center gap-3 p-6 md:p-8">
            <Activity className="h-6 w-6 text-destructive" aria-hidden="true" />
            <h2 className="font-display font-semibold uppercase">Finance data could not be loaded</h2>
            <p className="max-w-prose break-words text-sm text-muted-foreground">{error instanceof Error ? error.message : 'The order or payment event query failed.'}</p>
            <Button onClick={() => refetch()} disabled={isFetching} className="min-h-11 gap-2 uppercase">
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
              Retry
            </Button>
          </div>
        </AdminSurface>
      </div>
    );
  }

  const summary = data?.summary;
  const stats = [
    { title: 'Sales', icon: ShoppingBag, totals: summary?.sales ?? [], accent: true },
    { title: 'Payment received', icon: CircleDollarSign, totals: summary?.received ?? [] },
    { title: 'Pending', icon: Clock3, totals: summary?.pending ?? [] },
    { title: 'Submitted', icon: Activity, totals: summary?.submitted ?? [] },
    { title: 'Rejected', icon: CreditCard, totals: summary?.rejected ?? [] },
  ];
  const hasActivity = (data?.activity.length ?? 0) > 0;

  return (
    <div className="mx-auto min-w-0 max-w-[1400px] space-y-6">
      <AdminPageHeader
        eyebrow="OPERATIONS · FINANCE"
        title="Finance"
        meta="DERIVED FROM CURRENT ORDERS AND PAYMENT EVENTS"
        actions={
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="min-h-11 w-full gap-2 sm:w-auto">
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </Button>
        }
      />

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-5">
        {stats.map((stat) => <FinanceStat key={stat.title} {...stat} loading={isLoading} />)}
      </div>

      <p className="-mt-3 px-1 text-[10px] leading-relaxed text-muted-foreground/70">
        Sales exclude cancelled orders. Payment totals use each order’s current payment status; archived orders remain included.
      </p>

      <AdminSurface className="min-w-0 overflow-hidden">
        <div className="flex min-w-0 items-center gap-3 border-b border-white/[0.08] px-4 py-4 md:px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-sm font-semibold uppercase text-foreground">Recent finance activity</h2>
            <p className="mt-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">Orders and payment audit events</p>
          </div>
        </div>
        {isLoading ? (
          <ul aria-label="Loading finance activity" aria-busy="true" className="divide-y divide-white/[0.06]">
            {Array.from({ length: 4 }, (_, index) => <li key={index} className="space-y-3 px-4 py-4 md:px-5"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-56 max-w-full" /></li>)}
          </ul>
        ) : hasActivity ? (
          <ul aria-label="Recent finance activity" className="min-w-0">
            {data?.activity.map((item) => <FinanceActivityRow key={item.id} item={item} />)}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Activity className="h-6 w-6 text-muted-foreground/50" aria-hidden="true" />
            <p className="font-display text-sm font-semibold uppercase text-foreground">No finance activity yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">New orders and recorded payment updates will appear here.</p>
          </div>
        )}
      </AdminSurface>
    </div>
  );
}
