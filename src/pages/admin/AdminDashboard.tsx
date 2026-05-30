import { useQuery } from '@tanstack/react-query';
import { Package, Tags, Layers, ClipboardList, DollarSign, TrendingUp, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  confirmed: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  printing: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  shipped: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/30',
};

function StatCard({
  label,
  value,
  icon: Icon,
  meta,
  accent,
  loading,
}: {
  label: string;
  value: string | number;
  icon: any;
  meta?: string;
  accent?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${
        accent ? 'border-primary/30 bg-gradient-to-br from-primary/10 to-card/40' : 'border-border/60 bg-card/40'
      } backdrop-blur-xl p-4 group hover:border-primary/40 transition-colors`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        <Icon className={`w-4 h-4 ${accent ? 'text-primary' : 'text-muted-foreground/70'}`} strokeWidth={1.5} />
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <div className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight tabular-nums">
          {value}
        </div>
      )}
      {meta && <div className="mt-1.5 text-[11px] font-mono text-muted-foreground/70">{meta}</div>}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useLanguage();

  // Combined counts query — single round trip with parallel HEAD count calls
  const { data: counts, isLoading: loadingCounts } = useQuery({
    queryKey: ['admin-counts'],
    queryFn: async () => {
      const [p, c, m] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('categories').select('*', { count: 'exact', head: true }),
        supabase.from('materials').select('*', { count: 'exact', head: true }),
      ]);
      return { products: p.count ?? 0, categories: c.count ?? 0, materials: m.count ?? 0 };
    },
    staleTime: 60_000,
  });
  const productCount = counts?.products;
  const categoryCount = counts?.categories;
  const materialCount = counts?.materials;
  const loadingProducts = loadingCounts;
  const loadingCategories = loadingCounts;
  const loadingMaterials = loadingCounts;

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['admin-dashboard-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, total, status, created_at, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });
  const { data: orderStats, isLoading: loadingStats } = useQuery({
    queryKey: ['admin-order-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('total, status, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      const totalRevenue = data.reduce((s: number, o: any) => s + Number(o.total), 0);
      const totalOrders = data.length;
      const pending = data.filter((o: any) => o.status === 'pending').length;
      const last7 = data.filter(
        (o: any) => new Date(o.created_at).getTime() > Date.now() - 7 * 86400000,
      ).length;
      return { totalRevenue, totalOrders, pending, last7 };
    },
    staleTime: 30_000,
  });

  const now = new Date();
  const ts = `${now.toISOString().slice(0, 10)} · ${now.toTimeString().slice(0, 5)}`;

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground mb-2">
            overview · realtime
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
        </div>
        <div className="text-[11px] font-mono text-muted-foreground/70 tabular-nums">{ts}</div>
      </div>

      {/* Bento KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          label="Revenue"
          value={`$${(orderStats?.totalRevenue ?? 0).toFixed(2)}`}
          icon={DollarSign}
          meta={`${orderStats?.totalOrders ?? 0} orders total`}
          accent
          loading={loadingStats}
        />
        <StatCard
          label="Orders · 7d"
          value={orderStats?.last7 ?? 0}
          icon={TrendingUp}
          meta={`${orderStats?.pending ?? 0} pending`}
          loading={loadingStats}
        />
        <StatCard label="Products" value={productCount ?? 0} icon={Package} loading={loadingProducts} />
        <StatCard label="Categories" value={categoryCount ?? 0} icon={Tags} loading={loadingCategories} />
        <StatCard label="Materials" value={materialCount ?? 0} icon={Layers} loading={loadingMaterials} />
      </div>

      {/* Recent orders — Palantir table */}
      <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary/80" strokeWidth={1.5} />
            <h2 className="font-display text-sm font-semibold text-foreground">{t.dashboard.recentOrders}</h2>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground ml-2">
              live · last 6
            </span>
          </div>
          <Link
            to="/admin/orders"
            className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
          >
            view all <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-border/40">
          <div className="hidden md:grid grid-cols-[1fr_120px_120px_120px] gap-3 px-4 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/70 bg-background/30">
            <div>Customer</div>
            <div>Date</div>
            <div className="text-right">Total</div>
            <div className="text-right">Status</div>
          </div>
          {loadingOrders
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-4 py-3">
                  <Skeleton className="h-5 w-full" />
                </div>
              ))
            : orders.length === 0
              ? <p className="px-4 py-8 text-sm text-muted-foreground text-center">{t.dashboard.noOrders}</p>
              : orders.map((order: any) => (
                  <div
                    key={order.id}
                    className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_120px_120px_120px] gap-3 px-4 py-3 hover:bg-primary/[0.03] transition-colors group/row"
                  >
                    <div className="min-w-0">
                      <div className="text-sm text-foreground truncate font-medium">
                        {order.profiles?.full_name || t.dashboard.customer}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground/60 truncate">
                        #{order.id.slice(0, 8)}
                      </div>
                    </div>
                    <div className="hidden md:block text-[11px] font-mono text-muted-foreground tabular-nums self-center">
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                    <div className="hidden md:block text-right text-sm font-semibold text-foreground tabular-nums self-center">
                      ${Number(order.total).toFixed(2)}
                    </div>
                    <div className="flex md:justify-end items-center self-center">
                      <span
                        className={`px-2 py-0.5 rounded border text-[10px] font-mono uppercase tracking-wider ${statusColors[order.status]}`}
                      >
                        {t.orders.statuses[order.status as keyof typeof t.orders.statuses]}
                      </span>
                    </div>
                  </div>
                ))}
        </div>
      </div>
    </div>
  );
}
