import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Package, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  confirmed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  printing: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  shipped: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  delivered: 'bg-green-500/10 text-green-500 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
};

function OrderSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="w-5 h-5 rounded" />
          <div className="space-y-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ['my-order-items', expandedOrder],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select('*, products(name_en, name_es, images, slug)')
        .eq('order_id', expandedOrder!);
      if (error) throw error;
      return data;
    },
    enabled: !!expandedOrder,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-24 pb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-display font-black text-3xl sm:text-4xl mb-8">{t.orders.title}</h1>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <OrderSkeleton key={i} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">{t.orders.empty}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order: any, i: number) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  className="w-full p-5 flex items-center justify-between text-left hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Package className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-display font-semibold text-foreground">
                        {t.orders.order} #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className={statusColors[order.status] || ''}>
                      {t.orders.statuses[order.status as keyof typeof t.orders.statuses]}
                    </Badge>
                    <span className="font-bold text-gradient-gold">${Number(order.total).toFixed(2)}</span>
                    {expandedOrder === order.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {expandedOrder === order.id && (
                  <div className="border-t border-border p-5 space-y-3">
                    {orderItems.map((item: any) => (
                      <div key={item.id} className="flex gap-3 text-sm">
                        <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden shrink-0">
                          {(item.products?.images as string[])?.[0] && (
                            <img src={(item.products.images as string[])[0]} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{item.products?.name_en}</p>
                          <p className="text-muted-foreground">x{item.quantity} · ${Number(item.unit_price).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
      <Footer />
    </div>
  );
}
