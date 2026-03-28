import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, Eye, Mail, Phone, User } from 'lucide-react';
import { format } from 'date-fns';

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
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [fulfillProductId, setFulfillProductId] = useState('');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-model-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('model_requests')
        .select('*')
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
      const update: any = { status };
      if (fulfilled_product_id) update.fulfilled_product_id = fulfilled_product_id;
      const { error } = await supabase.from('model_requests').update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-model-requests'] });
      toast({ title: 'Status updated' });
      setSelectedRequest(null);
    },
  });

  const handleFulfill = (request: any) => {
    if (!fulfillProductId) return;
    updateStatus.mutate({ id: request.id, status: 'fulfilled', fulfilled_product_id: fulfillProductId });
  };

  const statusLabels = t.admin.requests.statuses;

  return (
    <div className="space-y-6">
      <h1 className="font-display font-bold text-2xl">{t.admin.requests.title}</h1>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : requests.length === 0 ? (
        <p className="text-muted-foreground">{t.admin.requests.empty}</p>
      ) : (
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.admin.requests.customer}</TableHead>
                <TableHead>{t.admin.requests.model}</TableHead>
                <TableHead>{t.admin.requests.status}</TableHead>
                <TableHead>{t.admin.requests.date}</TableHead>
                <TableHead>{t.admin.requests.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req: any) => (
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
                    <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(req)}>
                      <Eye className="w-4 h-4 mr-1" /> {t.admin.requests.viewDetails}
                    </Button>
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
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">{t.admin.requests.model}</h3>
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
                        {products.map((p: any) => (
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
    </div>
  );
}
