import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Tag, Pencil } from 'lucide-react';
import { AdminPageHeader, AdminSurface } from './_shared';

interface Discount {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_purchase: number;
  max_uses: number | null;
  current_uses: number;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
  show_banner: boolean;
  banner_text_en: string | null;
  banner_text_es: string | null;
}

const empty = {
  code: '', discount_type: 'percentage', discount_value: 10,
  min_purchase: 0, max_uses: '' as string | number,
  starts_at: new Date().toISOString().slice(0, 16),
  expires_at: '', is_active: true, show_banner: false,
  banner_text_en: '', banner_text_es: '',
};

export default function AdminDiscounts() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [form, setForm] = useState({ ...empty });

  const { data: codes = [] } = useQuery({
    queryKey: ['admin-discount-codes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('discount_codes').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Discount[];
    },
  });

  const openCreate = () => { setEditing(null); setForm({ ...empty }); setOpen(true); };
  const openEdit = (d: Discount) => {
    setEditing(d);
    setForm({
      code: d.code,
      discount_type: d.discount_type,
      discount_value: Number(d.discount_value),
      min_purchase: Number(d.min_purchase),
      max_uses: d.max_uses ?? '',
      starts_at: new Date(d.starts_at).toISOString().slice(0, 16),
      expires_at: d.expires_at ? new Date(d.expires_at).toISOString().slice(0, 16) : '',
      is_active: d.is_active,
      show_banner: d.show_banner,
      banner_text_en: d.banner_text_en || '',
      banner_text_es: d.banner_text_es || '',
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) { toast({ title: 'Código requerido', variant: 'destructive' }); return; }
    const payload: any = {
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value) || 0,
      min_purchase: Number(form.min_purchase) || 0,
      max_uses: form.max_uses === '' ? null : Number(form.max_uses),
      starts_at: new Date(form.starts_at).toISOString(),
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      is_active: form.is_active,
      show_banner: form.show_banner,
      banner_text_en: form.banner_text_en || null,
      banner_text_es: form.banner_text_es || null,
    };
    const { error } = editing
      ? await supabase.from('discount_codes').update(payload).eq('id', editing.id)
      : await supabase.from('discount_codes').insert(payload);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: editing ? 'Actualizado' : 'Código creado' });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ['admin-discount-codes'] });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar código?')) return;
    const { error } = await supabase.from('discount_codes').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Eliminado' });
    qc.invalidateQueries({ queryKey: ['admin-discount-codes'] });
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <AdminPageHeader
        eyebrow="operations · discounts"
        title="Discount Codes"
        meta={`${codes.length} active campaigns`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> New code</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit code' : 'New discount code'}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Code</Label>
                  <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SUMMER20" className="font-mono uppercase" />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.discount_type} onValueChange={v => setForm({ ...form, discount_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed amount ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Value</Label>
                  <Input type="number" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Min purchase ($)</Label>
                  <Input type="number" value={form.min_purchase} onChange={e => setForm({ ...form, min_purchase: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Max uses (blank = ∞)</Label>
                  <Input type="number" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} />
                </div>
                <div>
                  <Label>Starts at</Label>
                  <Input type="datetime-local" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })} />
                </div>
                <div>
                  <Label>Expires at (optional)</Label>
                  <Input type="datetime-local" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} />
                </div>
                <div className="col-span-2 flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <div className="text-sm font-medium">Active</div>
                    <div className="text-xs text-muted-foreground">Customers can redeem this code.</div>
                  </div>
                  <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                </div>
                <div className="col-span-2 flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <div className="text-sm font-medium">Show site banner</div>
                    <div className="text-xs text-muted-foreground">Display a sticky promo banner site-wide.</div>
                  </div>
                  <Switch checked={form.show_banner} onCheckedChange={v => setForm({ ...form, show_banner: v })} />
                </div>
                <div className="col-span-2">
                  <Label>Banner text (EN)</Label>
                  <Textarea rows={2} value={form.banner_text_en} onChange={e => setForm({ ...form, banner_text_en: e.target.value })} placeholder="Limited time · 20% off everything" />
                </div>
                <div className="col-span-2">
                  <Label>Banner text (ES)</Label>
                  <Textarea rows={2} value={form.banner_text_es} onChange={e => setForm({ ...form, banner_text_es: e.target.value })} placeholder="Tiempo limitado · 20% en todo" />
                </div>
              </div>
              <Button onClick={handleSave} className="w-full">Save</Button>
            </DialogContent>
          </Dialog>
        }
      />
      <AdminSurface>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <th className="text-left p-3">Code</th>
                <th className="text-left p-3">Discount</th>
                <th className="text-left p-3">Min</th>
                <th className="text-left p-3">Usage</th>
                <th className="text-left p-3">Window</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.map(d => (
                <tr key={d.id} className="border-b border-border/40 hover:bg-card/30 transition-colors">
                  <td className="p-3 font-mono font-semibold">
                    <span className="inline-flex items-center gap-2"><Tag className="w-3.5 h-3.5 text-primary" />{d.code}</span>
                  </td>
                  <td className="p-3 tabular-nums">{d.discount_type === 'percentage' ? `${d.discount_value}%` : `$${d.discount_value}`}</td>
                  <td className="p-3 tabular-nums text-muted-foreground">${Number(d.min_purchase).toFixed(0)}</td>
                  <td className="p-3 font-mono text-xs tabular-nums">{d.current_uses}{d.max_uses ? `/${d.max_uses}` : ''}</td>
                  <td className="p-3 font-mono text-[11px] text-muted-foreground">
                    {d.expires_at ? new Date(d.expires_at).toLocaleDateString() : '∞'}
                  </td>
                  <td className="p-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase ${d.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted/40 text-muted-foreground'}`}>
                      {d.is_active ? 'live' : 'off'}
                    </span>
                    {d.show_banner && <span className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-primary/15 text-primary">banner</span>}
                  </td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(d)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(d.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
              {codes.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground text-sm">No discount codes yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminSurface>
    </div>
  );
}
