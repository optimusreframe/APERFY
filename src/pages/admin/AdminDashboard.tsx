import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, BellRing, ClipboardList, DollarSign, Layers, LayoutTemplate, Package, SearchCheck, Tags, TrendingUp, type LucideIcon } from 'lucide-react';
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
  href,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  meta?: string;
  accent?: boolean;
  loading?: boolean;
  href: string;
}) {
  return (
    <Link
      to={href}
      aria-label={`Open ${label}`}
      className={`relative min-w-0 overflow-hidden rounded-xl border ${
        accent ? 'border-primary/30 bg-gradient-to-br from-primary/10 to-card' : 'border-border/60 bg-card'
      } p-4 group hover:border-primary/40 transition-colors`}
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
    </Link>
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
      return { products: p.count ?? 0, categories: c.count ?? 0, variants: m.count ?? 0 };
    },
    staleTime: 60_000,
  });
  const productCount = counts?.products;
  const categoryCount = counts?.categories;
  const materialCount = counts?.variants;
  const loadingProducts = loadingCounts;
  const loadingCategories = loadingCounts;
  const loadingMaterials = loadingCounts;

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['admin-dashboard-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, user_id, total, status, created_at')
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
      const totalRevenue = data.reduce((sum, order) => sum + Number(order.total), 0);
      const totalOrders = data.length;
      const pending = data.filter((order) => order.status === 'pending').length;
      const last7 = data.filter(
        (order) => new Date(order.created_at).getTime() > Date.now() - 7 * 86400000,
      ).length;
      return { totalRevenue, totalOrders, pending, last7 };
    },
    staleTime: 30_000,
  });

  const now = new Date();
  const ts = `${now.toISOString().slice(0, 10)} · ${now.toTimeString().slice(0, 5)}`;

  return (
    <div className="admin-dashboard mx-auto w-full min-w-0 max-w-[1400px] space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground mb-2">
            {t.admin.dashboard.eyebrow}
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            {t.admin.dashboard.title}
          </h1>
        </div>
        <div className="text-[11px] font-mono text-muted-foreground/70 tabular-nums">{ts}</div>
      </div>

      {/* Bento KPI grid */}
      <div className="grid min-w-0 grid-cols-1 min-[360px]:grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label={t.admin.dashboard.revenue}
          value={`$${(orderStats?.totalRevenue ?? 0).toFixed(2)}`}
          icon={DollarSign}
          meta={`${orderStats?.totalOrders ?? 0} ${t.admin.dashboard.ordersTotal}`}
          accent
          loading={loadingStats}
          href="/admin/finance"
        />
        <StatCard
          label={t.admin.dashboard.orders7d}
          value={orderStats?.last7 ?? 0}
          icon={TrendingUp}
          meta={`${orderStats?.pending ?? 0} ${t.admin.dashboard.pending}`}
          loading={loadingStats}
          href="/admin/orders"
        />
        <StatCard label={t.admin.dashboard.products} value={productCount ?? 0} icon={Package} loading={loadingProducts} href="/admin/products" />
        <StatCard label={t.admin.dashboard.categories} value={categoryCount ?? 0} icon={Tags} loading={loadingCategories} href="/admin/categories" />
        <StatCard label={t.admin.dashboard.variants} value={materialCount ?? 0} icon={Layers} loading={loadingMaterials} href="/admin/variants" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: '/admin/products', icon: Package, label: 'Catálogo', detail: 'Gestionar productos, imágenes y precios' },
          { href: '/admin/notifications', icon: BellRing, label: 'Notification Studio', detail: 'Crear y editar canales' },
          { href: '/admin/storefront-layout', icon: LayoutTemplate, label: 'Store Layout', detail: 'Ajustar experiencia por dispositivo' },
          { href: '/admin/seo', icon: SearchCheck, label: 'SEO & Social', detail: 'Previews, Google y buscadores' },
        ].map(({ href, icon: Icon, label, detail }) => <Link key={href} to={href} className="group flex min-w-0 items-center gap-3 rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/50 hover:bg-primary/[0.04]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-sm font-semibold text-foreground">{label}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{detail}</span></span><ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" /></Link>)}
      </div>

      {/* Recent orders — Palantir table */}
      <div className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary/80" strokeWidth={1.5} />
            <h2 className="font-display text-sm font-semibold text-foreground">{t.admin.dashboard.recentOrders}</h2>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground ml-2">
              {t.admin.dashboard.liveLast6}
            </span>
          </div>
          <Link
            to="/admin/orders"
            className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
          >
            {t.admin.dashboard.viewAll} <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-border/40">
          <div className="hidden md:grid grid-cols-[1fr_120px_120px_120px] gap-3 px-4 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground/70 bg-background/30">
            <div>{t.admin.dashboard.customer}</div>
            <div>{t.admin.dashboard.date}</div>
            <div className="text-right">{t.admin.dashboard.total}</div>
            <div className="text-right">{t.admin.dashboard.status}</div>
          </div>
          {loadingOrders
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-4 py-3">
                  <Skeleton className="h-5 w-full" />
                </div>
              ))
            : orders.length === 0
              ? <p className="px-4 py-8 text-sm text-muted-foreground text-center">{t.admin.dashboard.noOrders}</p>
              : orders.map((order) => (
                  <div
                    key={order.id}
                    className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_120px_120px_120px] gap-3 px-4 py-3 hover:bg-primary/[0.03] transition-colors group/row"
                  >
                    <div className="min-w-0">
                      <div className="text-sm text-foreground truncate font-medium">
                        {order.user_id ? `${t.admin.dashboard.customer} · ${order.user_id.slice(0, 8)}` : t.admin.dashboard.customer}
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
