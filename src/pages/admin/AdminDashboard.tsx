import { useQuery } from '@tanstack/react-query';
import { Package, Tags, Layers } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminDashboard() {
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

  const stats = [
    { label: 'Products', value: productCount ?? 0, icon: Package, color: 'text-primary' },
    { label: 'Categories', value: categoryCount ?? 0, icon: Tags, color: 'text-primary' },
    { label: 'Materials', value: materialCount ?? 0, icon: Layers, color: 'text-primary' },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold font-display text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
