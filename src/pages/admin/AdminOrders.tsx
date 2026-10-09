import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ChevronDown, ChevronUp, Package, DollarSign, List, LayoutGrid, MessageCircle, Archive, RotateCcw, Upload, FileCheck2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/lib/activity-log';
import { sendTransactionalEmail } from '@/lib/send-email';
import { buildIncomingOrderMessages } from '@/lib/incomingOrder';
import { normalizePhoneForCountry } from '@/lib/phone';
import { getOrderStatusUpdate, makeArchiveUpdate } from '@/lib/order-operations';
import { AdminPageHeader } from './_shared';
import type { Database } from '@/integrations/supabase/types';
import type { Order, OrderItem } from '@/lib/model-types';

type ShippingAddress = { email?: string; full_name?: string; address?: string; address2?: string; city?: string; state?: string; zip_code?: string; country?: string; country_code?: string; phone?: string; phone_country_code?: string; language?: 'es' | 'en' };
const shippingAddress = (value: unknown): ShippingAddress => value && typeof value === 'object' ? value as ShippingAddress : {};
type AdminOrderItem = OrderItem & { products?: { name_en: string; name_es?: string; images: unknown } | null };

const statuses = ['pending', 'confirmed', 'printing', 'shipped', 'delivered', 'cancelled'] as const;
const statusLabels: Record<string, string> = { pending: 'PENDING', confirmed: 'CONFIRMED', printing: 'PROCESSING', shipped: 'SHIPPED', delivered: 'DELIVERED', cancelled: 'CANCELLED' };

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  confirmed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  printing: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  shipped: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  delivered: 'bg-green-500/10 text-green-500 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const paymentStatusLabels: Record<string, string> = {
  pending: 'PAYMENT PENDING',
  submitted: 'PROOF SUBMITTED',
  received: 'PAYMENT RECEIVED',
  rejected: 'PAYMENT REJECTED',
};

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  submitted: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  received: 'bg-green-500/10 text-green-400 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
};

type PaymentEventType = 'proof_uploaded' | 'received' | 'rejected';

export default function AdminOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(() => searchParams.get('order'));
  const [view, setView] = useState<'list' | 'kanban'>(() => (localStorage.getItem('admin-orders-view') as 'list' | 'kanban') || 'list');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; archive: boolean } | null>(null);

  const switchView = (v: 'list' | 'kanban') => { setView(v); localStorage.setItem('admin-orders-view', v); };

  const { data: orders = [], isLoading, error: ordersError } = useQuery({
    queryKey: ['admin-orders', showArchived ? 'archived' : 'active'],
    queryFn: async () => {
      const ordersQuery = supabase
        .from('orders')
        // Do not join profiles here: orders.user_id intentionally has no FK to
        // profiles, and PostgREST turns the missing relationship into an empty
        // catalog while the admin inbox still receives its notification.
        .select('id, total, status, created_at, payment_method, payment_status, payment_proof_path, payment_proof_uploaded_at, payment_received_at, archived_at, archived_by, shipping_address, user_id, source, telegram_status, notes');
      const archivedQuery = showArchived
        ? ordersQuery.not('archived_at', 'is', null)
        : ordersQuery.is('archived_at', null);
      const { data, error } = await archivedQuery
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as unknown as Order[];
    },
    staleTime: 30_000,
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ['admin-order-items', expandedOrder],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select('*, products(name_en, images)')
        .eq('order_id', expandedOrder!);
      if (error) throw error;
      return data as unknown as AdminOrderItem[];
    },
    enabled: !!expandedOrder,
  });

  const { data: paymentEvents = [], error: paymentEventsError } = useQuery({
    queryKey: ['admin-payment-events', expandedOrder],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_events')
        .select('*')
        .eq('order_id', expandedOrder!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!expandedOrder,
  });

  const [openingProofId, setOpeningProofId] = useState<string | null>(null);

  const statusTemplateMap: Record<string, string> = {
    confirmed: 'order-confirmed',
    printing: 'order-printing',
    shipped: 'order-shipped',
    delivered: 'order-delivered',
    cancelled: 'order-cancelled',
  };

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Order['status'] }) => {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id);
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
      const order = orders.find((o) => o.id === variables.id);
      const templateName = statusTemplateMap[variables.status];
      if (order && templateName) {
        const address = shippingAddress(order.shipping_address);
        const email = address.email;
        const name = address.full_name;
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
    onError: (error: unknown) => {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to update order', variant: 'destructive' });
    },
  });

  const changeOrderStatus = (id: string, nextStatusValue: string) => {
    const nextStatus = statuses.find((status) => status === nextStatusValue);
    const currentOrder = orders.find((order) => order.id === id);
    if (!nextStatus || !currentOrder) return;
    const update = getOrderStatusUpdate(currentOrder.status, nextStatus);
    if (update) updateStatus.mutate({ id, status: update.status });
  };

  const archiveOrder = useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Sign in again before changing the order archive.');
      const update: Database['public']['Tables']['orders']['Update'] = makeArchiveUpdate(archive, user.id);
      const { error } = await supabase.from('orders').update(update).eq('id', id);
      if (error) throw error;
      return archive;
    },
    onSuccess: (archived) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setArchiveTarget(null);
      toast({ title: archived ? 'Order archived' : 'Order restored' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Could not update order archive', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    },
  });

  const recordPaymentEvent = useMutation({
    mutationFn: async ({ order, eventType, proofPath }: { order: Order; eventType: PaymentEventType; proofPath?: string }) => {
      const { error } = await supabase.rpc('record_order_payment_event', {
        p_order_id: order.id,
        p_event_type: eventType,
        p_proof_path: proofPath ?? null,
        p_note: null,
      });
      if (error) throw error;
      return { orderId: order.id, eventType };
    },
    onSuccess: ({ orderId, eventType }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-payment-events', orderId] });
      const message = eventType === 'proof_uploaded'
        ? 'Payment proof uploaded'
        : eventType === 'received'
          ? 'Payment marked as received'
          : 'Payment marked as rejected';
      toast({ title: message });
    },
    onError: (error: unknown) => {
      toast({ title: 'Could not record payment update', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    },
  });

  const uploadPaymentProof = useMutation({
    mutationFn: async ({ order, file }: { order: Order; file: File }) => {
      const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'file';
      const path = `${order.id}/proof-${Date.now()}-${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { error: eventError } = await supabase.rpc('record_order_payment_event', {
        p_order_id: order.id,
        p_event_type: 'proof_uploaded',
        p_proof_path: path,
        p_note: null,
      });
      if (eventError) {
        await supabase.storage.from('payment-proofs').remove([path]);
        throw eventError;
      }
      return order.id;
    },
    onSuccess: (orderId) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-payment-events', orderId] });
      toast({ title: 'Payment proof uploaded' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Could not upload payment proof', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    },
  });

  const handleConfirmPayment = (order: Order) => {
    const address = shippingAddress(order.shipping_address);
    const email = address.email;
    const name = address.full_name;
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

  const getCustomerWhatsAppUrl = (order: Order, items: AdminOrderItem[]): string | null => {
    const address = shippingAddress(order.shipping_address);
    if (!address.phone) return null;
    const language = address.language === 'en' ? 'en' : 'es';
    const phoneCountry = address.phone_country_code || address.country_code || 'US';
    const customerPhone = address.phone.startsWith('+')
      ? address.phone
      : normalizePhoneForCountry(address.phone, phoneCountry);
    const shipping = [address.address, address.address2, address.city, address.state, address.zip_code, address.country]
      .filter(Boolean)
      .join(', ');
    return buildIncomingOrderMessages({
      orderCode: order.id.slice(0, 8).toUpperCase(),
      customerName: address.full_name || 'cliente',
      phone: address.phone,
      email: address.email || '',
      items: items.map(item => {
        const variations = Array.isArray(item.selected_variations)
          ? item.selected_variations
            .map((variation) => {
              if (variation && typeof variation === 'object' && !Array.isArray(variation) && 'name' in variation && typeof variation.name === 'string') {
                return variation.name;
              }
              return '';
            })
            .filter(Boolean)
            .join(', ')
          : '';
        return {
          name: language === 'es' ? item.products?.name_es || item.products?.name_en || 'Producto' : item.products?.name_en || 'Product',
          quantity: item.quantity,
          total: Number(item.unit_price) * item.quantity,
          variation: variations,
        };
      }),
      total: Number(order.total),
      language,
      whatsappNumber: customerPhone,
      shipping,
      notes: order.notes || undefined,
    }).customerWhatsAppUrl;
  };

  const handlePaymentProofFile = (order: Order, file?: File) => {
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type) || file.size > 15 * 1024 * 1024) {
      toast({ title: 'Unsupported payment proof', description: 'Choose a JPG, PNG, WebP, or PDF up to 15 MB.', variant: 'destructive' });
      return;
    }
    uploadPaymentProof.mutate({ order, file });
  };

  const openPaymentProof = async (path: string, eventId: string) => {
    const proofWindow = window.open('about:blank', '_blank');
    if (!proofWindow) {
      toast({ title: 'Allow pop-ups to open the private payment proof', variant: 'destructive' });
      return;
    }
    proofWindow.opener = null;
    setOpeningProofId(eventId);
    try {
      const { data, error } = await supabase.storage.from('payment-proofs').createSignedUrl(path, 5 * 60);
      if (error) throw error;
      proofWindow.location.href = data.signedUrl;
    } catch (error) {
      proofWindow.close();
      toast({
        title: 'Could not open payment proof',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setOpeningProofId(null);
    }
  };

  const renderOrderDetails = (order: Order, layout: 'mobile' | 'desktop') => {
    const paymentProofInputId = `payment-proof-${layout}-${order.id}`;
    return (
    <div className="min-w-0 space-y-2">
      {orderItems.map((item) => (
        <div key={item.id} className="flex min-w-0 items-center gap-3 text-sm">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-secondary">
            {Array.isArray(item.products?.images) && typeof item.products.images[0] === 'string' && (
              <img src={item.products.images[0]} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <span className="min-w-0 flex-1 break-words font-medium">{item.products?.name_en}</span>
          <span className="shrink-0 text-muted-foreground">x{item.quantity}</span>
          <span className="shrink-0 font-semibold">${Number(item.unit_price).toFixed(2)}</span>
        </div>
      ))}
      {order.shipping_address && (
        <div className="mt-3 min-w-0 border-t border-border pt-3 text-xs text-muted-foreground">
          <p className="break-words"><strong>Customer:</strong> {shippingAddress(order.shipping_address).full_name}</p>
          <p className="break-words">Email: {shippingAddress(order.shipping_address).email || '—'}</p>
          <p className="break-words">Phone: {shippingAddress(order.shipping_address).phone || '—'}</p>
          <p className="break-words"><strong>Ship to:</strong> {[shippingAddress(order.shipping_address).address, shippingAddress(order.shipping_address).address2, shippingAddress(order.shipping_address).city, shippingAddress(order.shipping_address).state, shippingAddress(order.shipping_address).zip_code, shippingAddress(order.shipping_address).country].filter(Boolean).join(', ') || '—'}</p>
          <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
            {getCustomerWhatsAppUrl(order, orderItems) && <a href={getCustomerWhatsAppUrl(order, orderItems) || undefined} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp</a>}
            <span className="min-w-0 break-words">Source: {order.source || 'website'} · Telegram: {order.telegram_status || 'pending'}</span>
          </div>
        </div>
      )}
      <div className="mt-4 min-w-0 rounded-xl border border-border/60 bg-background/40 p-3 sm:p-4">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xs font-mono uppercase tracking-[0.16em]">Payment verification</h3>
            <p className="mt-1 break-words text-xs text-muted-foreground">
              Method: {order.payment_method || 'Not specified'} · Total: ${Number(order.total).toFixed(2)}
            </p>
          </div>
          <Badge variant="outline" className={`max-w-full whitespace-normal break-words ${paymentStatusColors[order.payment_status] || paymentStatusColors.pending}`}>
            {paymentStatusLabels[order.payment_status] || paymentStatusLabels.pending}
          </Badge>
        </div>
        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
          <input
            id={paymentProofInputId}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="sr-only"
            aria-label={`Upload payment proof for ${order.id}`}
            disabled={uploadPaymentProof.isPending}
            onChange={(event) => {
              handlePaymentProofFile(order, event.currentTarget.files?.[0]);
              event.currentTarget.value = '';
            }}
          />
          <label
            htmlFor={paymentProofInputId}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-xs font-medium transition-colors hover:bg-secondary/60 focus-within:ring-2 focus-within:ring-ring"
          >
            <Upload className="h-4 w-4" aria-hidden="true" /> Upload proof
          </label>
          {order.payment_proof_path && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-11 max-w-full gap-2"
              disabled={openingProofId === `proof-${order.id}`}
              onClick={() => void openPaymentProof(order.payment_proof_path!, `proof-${order.id}`)}
            >
              <FileCheck2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              {openingProofId === `proof-${order.id}` ? 'Opening proof…' : 'View private proof'}
            </Button>
          )}
          <Button
            size="sm"
            className="min-h-11"
            disabled={recordPaymentEvent.isPending || uploadPaymentProof.isPending || order.payment_status === 'received'}
            onClick={() => recordPaymentEvent.mutate({ order, eventType: 'received' })}
          >
            Mark received
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="min-h-11"
            disabled={recordPaymentEvent.isPending || uploadPaymentProof.isPending || order.payment_status === 'rejected'}
            onClick={() => recordPaymentEvent.mutate({ order, eventType: 'rejected' })}
          >
            Mark rejected
          </Button>
          {uploadPaymentProof.isPending && uploadPaymentProof.variables?.order.id === order.id && (
            <span role="status" className="text-xs text-primary">Uploading proof…</span>
          )}
          {recordPaymentEvent.isPending && recordPaymentEvent.variables?.order.id === order.id && (
            <span role="status" className="text-xs text-primary">Recording payment…</span>
          )}
        </div>
        {paymentEventsError && (
          <p role="status" className="mt-3 text-xs text-destructive">Payment history could not be loaded.</p>
        )}
        {paymentEvents.length > 0 && (
          <ol aria-label="Payment event history" className="mt-4 min-w-0 space-y-2 border-t border-border/50 pt-3">
            {paymentEvents.map((event) => (
              <li key={event.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="min-w-0 break-words">{paymentStatusLabels[event.event_type === 'proof_uploaded' ? 'submitted' : event.event_type] || event.event_type}</span>
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <span>Recorded by {event.actor_id ? event.actor_id.slice(0, 8) : 'system'}</span>
                  <time className="break-words" dateTime={event.occurred_at}>{new Date(event.occurred_at).toLocaleString()}</time>
                  {event.proof_path && (
                    <button
                      type="button"
                      className="min-h-11 px-2 text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      disabled={openingProofId === event.id}
                      onClick={() => void openPaymentProof(event.proof_path!, event.id)}
                    >
                      {openingProofId === event.id ? 'Opening…' : 'View proof'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
    );
  };

  return (
    <div className="mx-auto min-w-0 max-w-[1400px]">
      <AdminPageHeader
        eyebrow="operations · orders"
        title="Orders"
        meta={`${orders.length} ${showArchived ? 'archived' : 'active'} orders`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-border/60 bg-card/40 p-0.5" aria-label="Order archive filter">
              <button type="button" onClick={() => setShowArchived(false)} aria-pressed={!showArchived} className={`min-h-11 rounded-md px-3 text-[11px] font-mono uppercase tracking-wider transition-colors ${!showArchived ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>
                Active
              </button>
              <button type="button" onClick={() => setShowArchived(true)} aria-pressed={showArchived} className={`min-h-11 rounded-md px-3 text-[11px] font-mono uppercase tracking-wider transition-colors ${showArchived ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>
                Archived
              </button>
            </div>
            <div className="inline-flex rounded-lg border border-border/60 bg-card/40 p-0.5" aria-label="Order view">
              <button type="button" onClick={() => switchView('list')} aria-pressed={view === 'list'} className={`min-h-11 rounded-md px-3 text-[11px] font-mono uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors ${view === 'list' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>
                <List className="w-3.5 h-3.5" /> List
              </button>
              <button type="button" onClick={() => switchView('kanban')} aria-pressed={view === 'kanban'} className={`min-h-11 rounded-md px-3 text-[11px] font-mono uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors ${view === 'kanban' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>
                <LayoutGrid className="w-3.5 h-3.5" /> Kanban
              </button>
            </div>
          </div>
        }
      />


      {ordersError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
          No pudimos cargar las órdenes. Recarga el panel o revisa la migración/RLS de `orders`.
          <span className="mt-2 block text-xs opacity-80">{ordersError instanceof Error ? ordersError.message : 'Supabase query failed'}</span>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{showArchived ? 'No archived orders' : 'No orders yet'}</p>
        </div>
      ) : view === 'kanban' ? (
        <div
          role="region"
          aria-label="Orders by status. Scroll horizontally to view all status columns."
          tabIndex={0}
          className="grid min-w-0 grid-flow-col auto-cols-[minmax(16rem,1fr)] snap-x snap-proximity gap-3 overflow-x-auto overscroll-x-contain pb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring 2xl:grid-flow-row 2xl:grid-cols-6 2xl:overflow-visible"
        >
          {statuses.map(status => {
            const colOrders = orders.filter((order) => order.status === status);
            const colTotal = colOrders.reduce((sum, order) => sum + Number(order.total), 0);
            return (
              <div
                key={status}
                role="group"
                aria-label={`Drop orders to ${statusLabels[status]}`}
                onDragEnter={(e) => { e.preventDefault(); setDragOverStatus(status); }}
                onDragOver={(e) => { e.preventDefault(); setDragOverStatus(status); }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOverStatus(null);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const orderId = dragId || event.dataTransfer.getData('text/plain');
                  if (orderId) changeOrderStatus(orderId, status);
                  setDragId(null);
                  setDragOverStatus(null);
                }}
                className={`min-h-[400px] min-w-0 snap-start rounded-xl border bg-card/30 p-2 backdrop-blur-xl flex flex-col transition-colors ${dragOverStatus === status ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : 'border-border/60'}`}
              >
                <div className="px-2 py-2 mb-1 border-b border-border/40 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">{statusLabels[status]}</div>
                    <div className="font-mono text-[10px] text-muted-foreground/60 tabular-nums">${colTotal.toFixed(2)}</div>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums border ${statusColors[status]}`}>{colOrders.length}</span>
                </div>
                {dragOverStatus === status && <p className="px-2 pb-2 text-[10px] text-primary" role="status">Drop to move orders here</p>}
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain">
                  {colOrders.map((order) => (
                    <div
                      key={order.id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData('text/plain', order.id);
                        event.dataTransfer.effectAllowed = 'move';
                        setDragId(order.id);
                      }}
                      onDragEnd={() => { setDragId(null); setDragOverStatus(null); }}
                      className={`rounded-lg border border-border/60 bg-background/50 p-2.5 cursor-grab active:cursor-grabbing hover:border-primary/40 transition-all ${dragId === order.id ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-mono text-[10px] text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</span>
                        <span className="font-mono text-[11px] font-semibold tabular-nums">${Number(order.total).toFixed(2)}</span>
                      </div>
                      <div className="min-w-0 break-words text-[12px] font-medium text-foreground">
                        {shippingAddress(order.shipping_address).full_name || '—'}
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-muted-foreground/70 font-mono">
                          {new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                        {order.payment_method && (
                          <span className="min-w-0 break-words text-right text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60">{order.payment_method}</span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2">
                        <Badge variant="outline" className={`max-w-full whitespace-normal break-words text-[9px] ${paymentStatusColors[order.payment_status] || paymentStatusColors.pending}`}>
                          {paymentStatusLabels[order.payment_status] || paymentStatusLabels.pending}
                        </Badge>
                        {showArchived ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-11 gap-1.5 text-[10px]"
                            aria-label={`Restore order ${order.id}`}
                            disabled={archiveOrder.isPending}
                            onClick={() => archiveOrder.mutate({ id: order.id, archive: false })}
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Restore
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="min-h-11 gap-1.5 text-[10px]"
                            aria-label={`Archive order ${order.id}`}
                            onClick={() => setArchiveTarget({ id: order.id, archive: true })}
                          >
                            <Archive className="h-3.5 w-3.5" /> Archive
                          </Button>
                        )}
                      </div>
                      <Select
                        value={order.status}
                        onValueChange={(nextStatus) => changeOrderStatus(order.id, nextStatus)}
                      >
                        <SelectTrigger
                          aria-label={`Move order ${order.id}`}
                          className="mt-2 h-11 w-full border-primary/20 bg-primary/5 text-xs"
                          disabled={updateStatus.isPending && updateStatus.variables?.id === order.id}
                        >
                          <SelectValue placeholder="Move order" />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((nextStatus) => (
                            <SelectItem key={nextStatus} value={nextStatus}>{statusLabels[nextStatus]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {updateStatus.isPending && updateStatus.variables?.id === order.id && (
                        <span className="mt-1 text-[10px] text-primary" role="status">Saving status…</span>
                      )}
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
        <>
          <ul aria-label="Orders card list" className="grid min-w-0 gap-3 2xl:hidden">
            {orders.map((order) => {
              const expanded = expandedOrder === order.id;
              return (
                <li key={order.id} className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/80 shadow-sm">
                  <button
                    type="button"
                    aria-label={`${expanded ? 'Hide' : 'Show'} details for order ${order.id}`}
                    aria-expanded={expanded}
                    onClick={() => setExpandedOrder(expanded ? null : order.id)}
                    className="flex min-h-16 w-full min-w-0 items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-4"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</span>
                      <span className="mt-1 block break-words text-sm font-medium text-foreground">{shippingAddress(order.shipping_address).full_name || '—'}</span>
                    </span>
                    <span className="min-w-0 max-w-[42%] break-words text-right">
                      <span className="block text-[9px] font-mono uppercase tracking-wider text-muted-foreground/70">Total</span>
                      <span className="break-words font-mono text-sm font-semibold tabular-nums text-foreground">${Number(order.total).toFixed(2)}</span>
                    </span>
                    {expanded ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                  </button>

                  <div className="grid min-w-0 grid-cols-1 gap-3 border-t border-border/50 p-3 sm:grid-cols-2 sm:p-4">
                    <div className="min-w-0 space-y-1.5">
                      <span className="block text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Order status</span>
                      <Select value={order.status} onValueChange={(val) => changeOrderStatus(order.id, val)}>
                        <SelectTrigger
                          aria-label={`Order status ${order.id}`}
                          className="min-h-11 w-full min-w-0 border-primary/20 bg-primary/5"
                          disabled={updateStatus.isPending && updateStatus.variables?.id === order.id}
                        >
                          <Badge variant="outline" className={`max-w-full whitespace-normal break-words ${statusColors[order.status] || ''}`}>
                            {statusLabels[order.status] || order.status.toUpperCase()}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((nextStatus) => <SelectItem key={nextStatus} value={nextStatus}>{statusLabels[nextStatus]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {updateStatus.isPending && updateStatus.variables?.id === order.id && <span className="text-[10px] text-primary" role="status">Saving status…</span>}
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <span className="block text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Payment</span>
                      <Badge variant="outline" className={`min-h-11 max-w-full whitespace-normal break-words px-2.5 py-2 ${paymentStatusColors[order.payment_status] || paymentStatusColors.pending}`}>
                        {paymentStatusLabels[order.payment_status] || paymentStatusLabels.pending}
                      </Badge>
                    </div>
                    <div className="min-w-0 text-xs text-muted-foreground">
                      <span className="block text-[10px] font-mono uppercase tracking-wider">Date</span>
                      <time className="mt-1 block break-words" dateTime={order.created_at}>{new Date(order.created_at).toLocaleDateString()}</time>
                    </div>
                    <div className="min-w-0 text-xs text-muted-foreground">
                      <span className="block text-[10px] font-mono uppercase tracking-wider">Payment method</span>
                      <span className="mt-1 block break-words">{order.payment_method || 'Not specified'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-border/50 p-3 sm:px-4">
                    <Button size="sm" variant="outline" className="min-h-11 min-w-0 gap-1.5" onClick={() => handleConfirmPayment(order)}>
                      <DollarSign className="h-4 w-4 shrink-0" aria-hidden="true" /> Payment
                    </Button>
                    {showArchived ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-11 min-w-0 gap-1.5"
                        aria-label={`Restore order ${order.id}`}
                        disabled={archiveOrder.isPending}
                        onClick={() => archiveOrder.mutate({ id: order.id, archive: false })}
                      >
                        <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" /> Restore
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="min-h-11 min-w-0 gap-1.5"
                        aria-label={`Archive order ${order.id}`}
                        onClick={() => setArchiveTarget({ id: order.id, archive: true })}
                      >
                        <Archive className="h-4 w-4 shrink-0" aria-hidden="true" /> Archive
                      </Button>
                    )}
                  </div>
                  {expanded && (
                    <section aria-label={`Order details ${order.id}`} className="min-w-0 border-t border-border/50 bg-secondary/20 p-3 sm:p-4">
                      {renderOrderDetails(order, 'mobile')}
                    </section>
                  )}
                </li>
              );
            })}
          </ul>

        <div className="hidden overflow-hidden rounded-xl border border-border bg-card 2xl:block">
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
              {orders.map((order) => (
                <React.Fragment key={order.id}>
                  <TableRow className="cursor-pointer hover:bg-secondary/30" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                    <TableCell className="font-mono text-xs">#{order.id.slice(0, 8).toUpperCase()}</TableCell>
                    <TableCell className="max-w-72 break-words">{shippingAddress(order.shipping_address).full_name || '—'}</TableCell>
                    <TableCell>
                      <div className="flex min-w-0 flex-col items-start gap-1">
                      <Select
                        value={order.status}
                        onValueChange={(val) => changeOrderStatus(order.id, val)}
                      >
                        <SelectTrigger
                          aria-label={`Order status ${order.id}`}
                          className="min-h-11 w-36"
                          onClick={(e) => e.stopPropagation()}
                          disabled={updateStatus.isPending && updateStatus.variables?.id === order.id}
                        >
                          <Badge variant="outline" className={statusColors[order.status] || ''}>
                            {statusLabels[order.status] || order.status.toUpperCase()}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Badge variant="outline" className={`whitespace-nowrap text-[9px] ${paymentStatusColors[order.payment_status] || paymentStatusColors.pending}`}>
                        {paymentStatusLabels[order.payment_status] || paymentStatusLabels.pending}
                      </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">${Number(order.total).toFixed(2)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        {expandedOrder === order.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        <Button size="sm" variant="outline" className="min-h-11 text-xs gap-1" onClick={(e) => { e.stopPropagation(); handleConfirmPayment(order); }}>
                          <DollarSign className="w-3 h-3" /> Payment
                        </Button>
                        {showArchived ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-11 min-w-11 px-2 text-xs"
                            aria-label={`Restore order ${order.id}`}
                            title="Restore order"
                            disabled={archiveOrder.isPending}
                            onClick={(e) => { e.stopPropagation(); archiveOrder.mutate({ id: order.id, archive: false }); }}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="min-h-11 min-w-11 px-2 text-xs"
                            aria-label={`Archive order ${order.id}`}
                            title="Archive order"
                            onClick={(e) => { e.stopPropagation(); setArchiveTarget({ id: order.id, archive: true }); }}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {updateStatus.isPending && updateStatus.variables?.id === order.id && (
                    <TableRow aria-live="polite">
                      <TableCell colSpan={6} className="py-1 text-xs text-primary">Saving order status…</TableCell>
                    </TableRow>
                  )}
                  {expandedOrder === order.id && (
                    <TableRow key={`${order.id}-items`}>
                      <TableCell colSpan={6} className="bg-secondary/20 p-3 sm:p-4">{renderOrderDetails(order, 'desktop')}</TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
        </>
      )}
      <AlertDialog open={!!archiveTarget} onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{archiveTarget?.archive ? 'Archive this order?' : 'Restore this order?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {archiveTarget?.archive
                ? 'Move this order to the archive? You can restore it later.'
                : 'Restore this order to the active order list?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11" disabled={archiveOrder.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11"
              disabled={archiveOrder.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (archiveTarget) archiveOrder.mutate(archiveTarget);
              }}
            >
              {archiveOrder.isPending ? 'Saving…' : archiveTarget?.archive ? 'Archive order' : 'Restore order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
