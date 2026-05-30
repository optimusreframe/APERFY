import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Truck, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { AdminPageHeader } from './_shared';

interface ShippingProvider {
  id: string;
  name: string;
  description_en: string;
  description_es: string;
  base_rate: number;
  per_kg_rate: number;
  estimated_days_min: number;
  estimated_days_max: number;
  is_active: boolean;
}

const emptyForm = {
  name: '', description_en: '', description_es: '',
  base_rate: 0, per_kg_rate: 0,
  estimated_days_min: 1, estimated_days_max: 5, is_active: true,
};

export default function AdminShipping() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['admin-shipping-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipping_providers')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ShippingProvider[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        description_en: form.description_en.trim(),
        description_es: form.description_es.trim(),
        base_rate: form.base_rate,
        per_kg_rate: form.per_kg_rate,
        estimated_days_min: form.estimated_days_min,
        estimated_days_max: form.estimated_days_max,
        is_active: form.is_active,
      };
      if (editingId) {
        const { error } = await supabase.from('shipping_providers').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('shipping_providers').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-shipping-providers'] });
      toast({ title: editingId ? 'Provider updated' : 'Provider created' });
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shipping_providers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-shipping-providers'] });
      toast({ title: 'Provider deleted' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const resetForm = () => { setForm(emptyForm); setEditingId(null); };

  const openEdit = (p: ShippingProvider) => {
    setEditingId(p.id);
    setForm({
      name: p.name, description_en: p.description_en || '', description_es: p.description_es || '',
      base_rate: Number(p.base_rate), per_kg_rate: Number(p.per_kg_rate),
      estimated_days_min: p.estimated_days_min, estimated_days_max: p.estimated_days_max, is_active: p.is_active,
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <AdminPageHeader
        eyebrow="operations · shipping"
        title="Shipping Providers"
        meta="Manage shipping options and rates"
        actions={
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Add Provider</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit' : 'New'} Shipping Provider</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Provider Name *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="mt-1" placeholder="e.g. Standard Shipping" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Description (EN)</Label>
                  <Input value={form.description_en} onChange={e => setForm(p => ({ ...p, description_en: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>Description (ES)</Label>
                  <Input value={form.description_es} onChange={e => setForm(p => ({ ...p, description_es: e.target.value }))} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Base Rate ($)</Label>
                  <Input type="number" step="0.01" value={form.base_rate} onFocus={e => e.target.select()} onChange={e => setForm(p => ({ ...p, base_rate: parseFloat(e.target.value) || 0 }))} className="mt-1" />
                </div>
                <div>
                  <Label>Per KG Rate ($)</Label>
                  <Input type="number" step="0.01" value={form.per_kg_rate} onFocus={e => e.target.select()} onChange={e => setForm(p => ({ ...p, per_kg_rate: parseFloat(e.target.value) || 0 }))} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Min Days</Label>
                  <Input type="number" value={form.estimated_days_min} onChange={e => setForm(p => ({ ...p, estimated_days_min: parseInt(e.target.value) || 1 }))} className="mt-1" />
                </div>
                <div>
                  <Label>Max Days</Label>
                  <Input type="number" value={form.estimated_days_max} onChange={e => setForm(p => ({ ...p, estimated_days_max: parseInt(e.target.value) || 5 }))} className="mt-1" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.name.trim() || saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingId ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : providers.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Truck className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground">No shipping providers yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add your first shipping provider to enable shipping in checkout</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Base Rate</TableHead>
                <TableHead>Per KG</TableHead>
                <TableHead>Est. Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>${Number(p.base_rate).toFixed(2)}</TableCell>
                  <TableCell>${Number(p.per_kg_rate).toFixed(2)}</TableCell>
                  <TableCell>{p.estimated_days_min}-{p.estimated_days_max} days</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.is_active ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(p.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
