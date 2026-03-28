import { useQuery } from '@tanstack/react-query';
import { Package, Tags, Layers, ClipboardList, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  confirmed: 'bg-blue-500/20 text-blue-400',
  printing: 'bg-purple-500/20 text-purple-400',
  shipped: 'bg-cyan-500/20 text-cyan-400',
  delivered: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
};

export default function AdminDashboard() {
  const { t } = useLanguage();

  const { data: productCount } = useQuery({
    queryKey: ['admin-product-count'],
    queryFn: async () => {
      const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
  });

  const { data: categoryCount } = useQuery({
    queryKey: ['admin-category-count'],
    queryFn: async () => {
      const { count } = await supabase.from('categories').select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
  });

  const { data: materialCount } = useQuery({
    queryKey: ['admin-material-count'],
    queryFn: async () => {
      const { count } = await supabase.from('materials').select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['admin-dashboard-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const { data: orderStats } = useQuery({
    queryKey: ['admin-order-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('total, status');
      if (error) throw error;
      const totalRevenue = data.reduce((sum: number, o: any) => sum + Number(o.total), 0);
      const totalOrders = data.length;
      return { totalRevenue, totalOrders };
    },
  });

  const stats = [
    { label: t.dashboard.orders, value: orderStats?.totalOrders ?? 0, icon: ClipboardList, color: 'text-primary' },
    { label: t.dashboard.revenue, value: `$${(orderStats?.totalRevenue ?? 0).toFixed(2)}`, icon: DollarSign, color: 'text-primary' },
    { label: 'Products', value: productCount ?? 0, icon: Package, color: 'text-primary' },
    { label: 'Categories', value: categoryCount ?? 0, icon: Tags, color: 'text-primary' },
    { label: 'Materials', value: materialCount ?? 0, icon: Layers, color: 'text-primary' },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-display text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">{t.dashboard.recentOrders}</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t.dashboard.noOrders}</p>
          ) : (
            <div className="space-y-3">
              {orders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {order.profiles?.full_name || t.dashboard.customer}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-foreground">${Number(order.total).toFixed(2)}</span>
                    <Badge className={`${statusColors[order.status]} border-0 text-xs`}>
                      {t.orders.statuses[order.status as keyof typeof t.orders.statuses]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
