import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Archive, ExternalLink, Eye, Mail, Phone, RotateCcw, User } from 'lucide-react';
import { format } from 'date-fns';
import { AdminPageHeader } from './_shared';
import type { Database } from '@/integrations/supabase/types';
import type { Product } from '@/lib/model-types';
import { makeArchiveUpdate } from '@/lib/order-operations';

type ModelRequest = Database['public']['Tables']['model_requests']['Row'];

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  reviewing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  fulfilled: 'bg-green-500/20 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function AdminRequests() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<ModelRequest | null>(null);
  const [fulfillProductId, setFulfillProductId] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; archive: boolean } | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-model-requests', showArchived ? 'archived' : 'active'],
    queryFn: async () => {
      const requestsQuery = supabase
        .from('model_requests')
        .select('*');
      const filteredQuery = showArchived
        ? requestsQuery.not('archived_at', 'is', null)
        : requestsQuery.is('archived_at', null);
      const { data, error } = await filteredQuery
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['admin-products-for-fulfill'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('id, name_en, name_es, slug').eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, fulfilled_product_id }: { id: string; status: string; fulfilled_product_id?: string }) => {
      const update: Database['public']['Tables']['model_requests']['Update'] = { status };
      if (fulfilled_product_id) update.fulfilled_product_id = fulfilled_product_id;
      const { error } = await supabase.from('model_requests').update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-model-requests'] });
      toast({ title: 'Status updated' });
      setSelectedRequest(null);
    },
    onError: (error: unknown) => {
      toast({ title: 'Could not update request', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    },
  });

  const archiveRequest = useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Sign in again before changing the request archive.');
      const update: Database['public']['Tables']['model_requests']['Update'] = makeArchiveUpdate(archive, user.id);
      const { error } = await supabase.from('model_requests').update(update).eq('id', id);
      if (error) throw error;
      return archive;
    },
    onSuccess: (archived) => {
      queryClient.invalidateQueries({ queryKey: ['admin-model-requests'] });
      setArchiveTarget(null);
      setSelectedRequest(null);
      toast({ title: archived ? 'Request archived' : 'Request restored' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Could not update request archive', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    },
  });

  const handleFulfill = (request: ModelRequest) => {
    if (!fulfillProductId) return;
    updateStatus.mutate({ id: request.id, status: 'fulfilled', fulfilled_product_id: fulfillProductId });
  };

  const statusLabels = t.admin.requests.statuses;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <AdminPageHeader
        eyebrow="operations · requests"
        title={t.admin.requests.title}
        meta={`${requests.length} ${showArchived ? 'archived' : 'active'}`}
        actions={
          <div className="inline-flex rounded-lg border border-border/60 bg-card/40 p-0.5" aria-label="Request archive filter">
            <Button type="button" size="sm" variant={showArchived ? 'ghost' : 'secondary'} className="min-h-11" aria-pressed={!showArchived} onClick={() => setShowArchived(false)}>Active</Button>
            <Button type="button" size="sm" variant={showArchived ? 'secondary' : 'ghost'} className="min-h-11" aria-pressed={showArchived} onClick={() => setShowArchived(true)}>Archived</Button>
          </div>
        }
      />

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : requests.length === 0 ? (
        <p className="text-muted-foreground">{showArchived ? 'No archived requests' : t.admin.requests.empty}</p>
      ) : (
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.admin.requests.customer}</TableHead>
                <TableHead>{t.admin.requests.product}</TableHead>
                <TableHead>{t.admin.requests.status}</TableHead>
                <TableHead>{t.admin.requests.date}</TableHead>
                <TableHead>{t.admin.requests.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req: ModelRequest) => (
                <TableRow key={req.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{req.name}</div>
                      <div className="text-xs text-muted-foreground">{req.email}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{req.product_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[req.status] || ''}>
                      {statusLabels[req.status as keyof typeof statusLabels] || req.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(req.created_at), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="ghost" size="sm" className="min-h-11" onClick={() => setSelectedRequest(req)}>
                        <Eye className="w-4 h-4 mr-1" /> {t.admin.requests.viewDetails}
                      </Button>
                      {showArchived ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-11 gap-1.5"
                          aria-label={`Restore request ${req.id}`}
                          disabled={archiveRequest.isPending}
                          onClick={() => archiveRequest.mutate({ id: req.id, archive: false })}
                        >
                          <RotateCcw className="h-4 w-4" /> Restore
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="min-h-11 gap-1.5"
                          aria-label={`Archive request ${req.id}`}
                          onClick={() => setArchiveTarget({ id: req.id, archive: true })}
                        >
                          <Archive className="h-4 w-4" /> Archive
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.admin.requests.detailsTitle}</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              {/* Contact */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">{t.admin.requests.contactInfo}</h3>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2"><User className="w-4 h-4 text-primary" /> {selectedRequest.name}</div>
                  <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> {selectedRequest.email}</div>
                  <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> {selectedRequest.phone}</div>
                </div>
              </div>

              {/* Model Details */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">{t.admin.requests.product}</h3>
                <p className="font-medium text-lg">{selectedRequest.product_name}</p>
                {selectedRequest.description && (
                  <div>
                    <h4 className="text-sm text-muted-foreground">{t.admin.requests.notes}</h4>
                    <p className="text-sm mt-1">{selectedRequest.description}</p>
                  </div>
                )}
                {selectedRequest.reference_url && (
                  <a href={selectedRequest.reference_url} target="_blank" rel="noopener noreferrer"
                    className="text-primary text-sm flex items-center gap-1 hover:underline">
                    <ExternalLink className="w-3 h-3" /> {t.admin.requests.referenceUrl}
                  </a>
                )}
              </div>

              {/* Images */}
              {Array.isArray(selectedRequest.images) && selectedRequest.images.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">{t.admin.requests.referenceImages}</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedRequest.images.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="" className="rounded-lg w-full aspect-square object-cover border border-border/50" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Update */}
              <div className="space-y-3 border-t border-border pt-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">{t.admin.requests.updateStatus}</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"
                    disabled={selectedRequest.status === 'reviewing'}
                    onClick={() => updateStatus.mutate({ id: selectedRequest.id, status: 'reviewing' })}>
                    {statusLabels.reviewing}
                  </Button>
                  <Button variant="outline" size="sm"
                    className="text-destructive border-destructive/30"
                    disabled={selectedRequest.status === 'rejected'}
                    onClick={() => updateStatus.mutate({ id: selectedRequest.id, status: 'rejected' })}>
                    {t.admin.requests.reject}
                  </Button>
                </div>

                {/* Fulfill with product link */}
                {selectedRequest.status !== 'fulfilled' && (
                  <div className="space-y-2 mt-4">
                    <p className="text-xs text-muted-foreground">{t.admin.requests.fulfillConfirm}</p>
                    <Select value={fulfillProductId} onValueChange={setFulfillProductId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t.admin.requests.selectProduct} />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p: Pick<Product, 'id' | 'name_en' | 'name_es' | 'slug'>) => (
                          <SelectItem key={p.id} value={p.id}>
                            {language === 'es' ? p.name_es : p.name_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={() => handleFulfill(selectedRequest)}
                      disabled={!fulfillProductId || updateStatus.isPending}
                      className="bg-gradient-gold text-primary-foreground">
                      {t.admin.requests.fulfill}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!archiveTarget} onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{language === 'es'
              ? (archiveTarget?.archive ? '¿Archivar solicitud?' : '¿Restaurar solicitud?')
              : (archiveTarget?.archive ? 'Archive request?' : 'Restore request?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {archiveTarget?.archive
                ? (language === 'es'
                  ? 'La solicitud se moverá al archivo y podrás restaurarla después. No se eliminarán sus datos.'
                  : 'Move this request to the archive? It stays in APERFY and can be restored later.')
                : (language === 'es'
                  ? 'La solicitud volverá a la lista activa.'
                  : 'Restore this request to the active request list?')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11" disabled={archiveRequest.isPending}>{language === 'es' ? 'Cancelar' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              disabled={archiveRequest.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (archiveTarget) archiveRequest.mutate(archiveTarget);
              }}
            >
              {archiveRequest.isPending
                ? (language === 'es'
                  ? (archiveTarget?.archive ? 'Archivando…' : 'Restaurando…')
                  : (archiveTarget?.archive ? 'Archiving…' : 'Restoring…'))
                : (language === 'es'
                  ? (archiveTarget?.archive ? 'Archivar solicitud' : 'Restaurar solicitud')
                  : (archiveTarget?.archive ? 'Archive request' : 'Restore request'))}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
