import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { AdminPageHeader, AdminSurface } from './_shared';

type VariantPreset = { name_en: string; name_es: string; description_en: string; description_es: string; is_active: boolean };
const empty: VariantPreset = { name_en: '', name_es: '', description_en: '', description_es: '', is_active: true };

export default function AdminMaterials() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<VariantPreset>(empty);
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: variants = [] } = useQuery({ queryKey: ['admin-variants'], queryFn: async () => { const { data, error } = await supabase.from('materials').select('*').order('created_at', { ascending: false }); if (error) throw error; return data; } });
  const save = useMutation({ mutationFn: async (value: VariantPreset) => { const result = editId ? await supabase.from('materials').update(value).eq('id', editId) : await supabase.from('materials').insert(value); if (result.error) throw result.error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-variants'] }); setOpen(false); setEditId(null); setForm(empty); toast({ title: 'GUARDADO', description: 'PRESET DE VARIANTE ACTUALIZADO.' }); }, onError: (error: any) => toast({ title: 'ERROR', description: error.message, variant: 'destructive' }) });
  const remove = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from('materials').delete().eq('id', id); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-variants'] }); toast({ title: 'ELIMINADO', description: 'PRESET DE VARIANTE ELIMINADO.' }); } });

  const edit = (row: any) => { setEditId(row.id); setForm({ name_en: row.name_en || '', name_es: row.name_es || '', description_en: row.description_en || '', description_es: row.description_es || '', is_active: row.is_active }); setOpen(true); };
  const close = (value: boolean) => { setOpen(value); if (!value) { setEditId(null); setForm(empty); } };
  return <div className="mx-auto max-w-[1400px]">
    <AdminPageHeader eyebrow="CATALOG · VARIANTS" title="VARIANTS" meta={`${variants.length} VARIANT PRESETS`} actions={<Dialog open={open} onOpenChange={close}><DialogTrigger asChild><Button className="gap-2 uppercase"><Plus className="h-4 w-4" /> NEW VARIANT</Button></DialogTrigger><DialogContent className="border-white/10 bg-card"><DialogHeader><DialogTitle className="uppercase">{editId ? 'EDIT' : 'ADD'} VARIANT PRESET</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={event => { event.preventDefault(); save.mutate(form); }}><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>NAME (EN)</Label><Input value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} required /></div><div className="space-y-2"><Label>NAME (ES)</Label><Input value={form.name_es} onChange={e => setForm({ ...form, name_es: e.target.value })} required /></div></div><div className="space-y-2"><Label>DESCRIPTION (EN)</Label><Textarea value={form.description_en} onChange={e => setForm({ ...form, description_en: e.target.value })} /></div><div className="space-y-2"><Label>DESCRIPTION (ES)</Label><Textarea value={form.description_es} onChange={e => setForm({ ...form, description_es: e.target.value })} /></div><div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={is_active => setForm({ ...form, is_active })} /><Label>ACTIVE</Label></div><Button className="w-full uppercase" type="submit" disabled={save.isPending}>SAVE VARIANT</Button></form></DialogContent></Dialog>} />
    <AdminSurface><Table><TableHeader><TableRow><TableHead>NAME (EN)</TableHead><TableHead>NAME (ES)</TableHead><TableHead>DESCRIPTION</TableHead><TableHead>STATUS</TableHead><TableHead className="text-right">ACTIONS</TableHead></TableRow></TableHeader><TableBody>{variants.map((row: any) => <TableRow key={row.id}><TableCell className="font-medium">{row.name_en}</TableCell><TableCell>{row.name_es}</TableCell><TableCell className="max-w-[360px] truncate text-muted-foreground">{row.description_es || row.description_en || '—'}</TableCell><TableCell><span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">{row.is_active ? 'ACTIVE' : 'INACTIVE'}</span></TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => edit(row)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove.mutate(row.id)}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)}{variants.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">NO VARIANT PRESETS YET.</TableCell></TableRow>}</TableBody></Table></AdminSurface>
  </div>;
}
