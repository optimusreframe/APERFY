import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Package, DollarSign, List, LayoutGrid } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/lib/activity-log';
import { sendTransactionalEmail } from '@/lib/send-email';
import { AdminPageHeader } from './_shared';

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
  const [view, setView] = useState<'list' | 'kanban'>(() => (localStorage.getItem('admin-orders-view') as 'list' | 'kanban') || 'list');
  const [dragId, setDragId] = useState<string | null>(null);

  const switchView = (v: 'list' | 'kanban') => { setView(v); localStorage.setItem('admin-orders-view', v); };

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

  const statusTemplateMap: Record<string, string> = {
    confirmed: 'order-confirmed',
    printing: 'order-printing',
    shipped: 'order-shipped',
    delivered: 'order-delivered',
    cancelled: 'order-cancelled',
  };

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('orders').update({ status: status as any }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      logActivity({
        action: 'order_status_changed',
        category: 'order',
        entity_type: 'order',
        entity_id: variables.id,
        title: `Estado de orden cambiado a: ${variables.status}`,
        metadata: { new_status: variables.status },
      });

      // Send status email to customer
      const order = orders.find((o: any) => o.id === variables.id);
      const templateName = statusTemplateMap[variables.status];
      if (order && templateName) {
        const email = (order.shipping_address as any)?.email;
        const name = (order.shipping_address as any)?.full_name;
        if (email) {
          sendTransactionalEmail({
            templateName,
            recipientEmail: email,
            idempotencyKey: `order-${variables.status}-${variables.id}`,
            templateData: { customerName: name, orderId: variables.id },
          });
        }
      }

      toast({ title: 'Order status updated' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const handleConfirmPayment = (order: any) => {
    const email = (order.shipping_address as any)?.email;
    const name = (order.shipping_address as any)?.full_name;
    if (email) {
      sendTransactionalEmail({
        templateName: 'payment-received',
        recipientEmail: email,
        idempotencyKey: `payment-received-${order.id}`,
        templateData: { customerName: name, orderId: order.id, total: Number(order.total).toFixed(2) },
      });
      toast({ title: 'Payment confirmation email sent' });
    } else {
      toast({ title: 'No email found for this order', variant: 'destructive' });
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <AdminPageHeader
        eyebrow="operations · orders"
        title="Orders"
        meta={`${orders.length} total`}
        actions={
          <div className="inline-flex rounded-lg border border-border/60 bg-card/40 p-0.5">
            <button onClick={() => switchView('list')} className={`px-3 h-8 rounded-md text-[11px] font-mono uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors ${view === 'list' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button onClick={() => switchView('kanban')} className={`px-3 h-8 rounded-md text-[11px] font-mono uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors ${view === 'kanban' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>
              <LayoutGrid className="w-3.5 h-3.5" /> Kanban
            </button>
          </div>
        }
      />


      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No orders yet</p>
        </div>
      ) : view === 'kanban' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {statuses.map(status => {
            const colOrders = orders.filter((o: any) => o.status === status);
            const colTotal = colOrders.reduce((s: number, o: any) => s + Number(o.total), 0);
            return (
              <div
                key={status}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragId) {
                    const o = orders.find((x: any) => x.id === dragId);
                    if (o && o.status !== status) updateStatus.mutate({ id: dragId, status });
                  }
                  setDragId(null);
                }}
                className="min-h-[400px] rounded-xl border border-border/60 bg-card/30 backdrop-blur-xl p-2 flex flex-col"
              >
                <div className="px-2 py-2 mb-1 border-b border-border/40 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">{status}</div>
                    <div className="font-mono text-[10px] text-muted-foreground/60 tabular-nums">${colTotal.toFixed(2)}</div>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums border ${statusColors[status]}`}>{colOrders.length}</span>
                </div>
                <div className="space-y-2 flex-1 overflow-y-auto">
                  {colOrders.map((order: any) => (
                    <div
                      key={order.id}
                      draggable
                      onDragStart={() => setDragId(order.id)}
                      onDragEnd={() => setDragId(null)}
                      className={`rounded-lg border border-border/60 bg-background/50 p-2.5 cursor-grab active:cursor-grabbing hover:border-primary/40 transition-all ${dragId === order.id ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-mono text-[10px] text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</span>
                        <span className="font-mono text-[11px] font-semibold tabular-nums">${Number(order.total).toFixed(2)}</span>
                      </div>
                      <div className="text-[12px] text-foreground truncate font-medium">
                        {(order as any).profiles?.full_name || (order.shipping_address as any)?.full_name || '—'}
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-muted-foreground/70 font-mono">
                          {new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                        {order.payment_method && (
                          <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60">{order.payment_method}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {colOrders.length === 0 && (
                    <div className="text-center text-[10px] text-muted-foreground/40 py-6 font-mono uppercase tracking-wider">empty</div>
                  )}
                </div>
              </div>
            );
          })}
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
                      <div className="flex items-center gap-2">
                        {expandedOrder === order.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); handleConfirmPayment(order); }}>
                          <DollarSign className="w-3 h-3" /> Payment
                        </Button>
                      </div>
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
