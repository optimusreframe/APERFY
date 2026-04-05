import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/lib/activity-log';

const statuses = ['pending', 'confirmed', 'printing', 'shipped', 'delivered', 'cancelled'] as const;

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  confirmed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  printing: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  shipped: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  delivered: 'bg-green-500/10 text-green-500 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export default function AdminOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, profiles(full_name, phone)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ['admin-order-items', expandedOrder],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select('*, products(name_en, images)')
        .eq('order_id', expandedOrder!);
      if (error) throw error;
      return data;
    },
    enabled: !!expandedOrder,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('orders').update({ status: status as any }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({ title: 'Order status updated' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-display font-bold mb-6">Orders</h1>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No orders yet</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order: any) => (
                <React.Fragment key={order.id}>
                  <TableRow className="cursor-pointer hover:bg-secondary/30" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                    <TableCell className="font-mono text-xs">#{order.id.slice(0, 8).toUpperCase()}</TableCell>
                    <TableCell>{(order as any).profiles?.full_name || '—'}</TableCell>
                    <TableCell>
                      <Select
                        value={order.status}
                        onValueChange={(val) => { updateStatus.mutate({ id: order.id, status: val }); }}
                      >
                        <SelectTrigger className="w-32 h-8" onClick={(e) => e.stopPropagation()}>
                          <Badge variant="outline" className={statusColors[order.status] || ''}>
                            {order.status}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="font-bold">${Number(order.total).toFixed(2)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {expandedOrder === order.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </TableCell>
                  </TableRow>
                  {expandedOrder === order.id && (
                    <TableRow key={`${order.id}-items`}>
                      <TableCell colSpan={6} className="bg-secondary/20 p-4">
                        <div className="space-y-2">
                          {orderItems.map((item: any) => (
                            <div key={item.id} className="flex items-center gap-3 text-sm">
                              <div className="w-10 h-10 rounded bg-secondary overflow-hidden">
                                {(item.products?.images as string[])?.[0] && (
                                  <img src={(item.products.images as string[])[0]} alt="" className="w-full h-full object-cover" />
                                )}
                              </div>
                              <span className="font-medium">{item.products?.name_en}</span>
                              <span className="text-muted-foreground">x{item.quantity}</span>
                              <span className="ml-auto font-semibold">${Number(item.unit_price).toFixed(2)}</span>
                            </div>
                          ))}
                          {order.shipping_address && (
                            <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                              <p><strong>Ship to:</strong> {(order.shipping_address as any).full_name}</p>
                              <p>{(order.shipping_address as any).address}, {(order.shipping_address as any).city}</p>
                              <p>Phone: {(order.shipping_address as any).phone}</p>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
