import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface MaterialForm {
  name_en: string;
  name_es: string;
  description_en: string;
  description_es: string;
  is_active: boolean;
}

const empty: MaterialForm = { name_en: '', name_es: '', description_en: '', description_es: '', is_active: true };

export default function AdminMaterials() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<MaterialForm>(empty);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: materials = [] } = useQuery({
    queryKey: ['admin-materials'],
    queryFn: async () => {
      const { data, error } = await supabase.from('materials').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (f: MaterialForm) => {
      if (editId) {
        const { error } = await supabase.from('materials').update(f).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('materials').insert(f);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-materials'] });
      qc.invalidateQueries({ queryKey: ['admin-material-count'] });
      setOpen(false);
      setEditId(null);
      setForm(empty);
      toast({ title: '✓', description: 'Material saved.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('materials').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-materials'] });
      qc.invalidateQueries({ queryKey: ['admin-material-count'] });
      toast({ title: '✓', description: 'Material deleted.' });
    },
  });

  const openEdit = (m: any) => {
    setEditId(m.id);
    setForm({ name_en: m.name_en, name_es: m.name_es, description_en: m.description_en || '', description_es: m.description_es || '', is_active: m.is_active });
    setOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Materials</h1>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm(empty); } }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-gold text-primary-foreground gap-2"><Plus className="w-4 h-4" />Add Material</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle className="font-display">{editId ? 'Edit' : 'Add'} Material</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Name (EN)</Label><Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} className="bg-secondary" required /></div>
                <div className="space-y-2"><Label>Name (ES)</Label><Input value={form.name_es} onChange={(e) => setForm({ ...form, name_es: e.target.value })} className="bg-secondary" required /></div>
              </div>
              <div className="space-y-2"><Label>Description (EN)</Label><Textarea value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} className="bg-secondary" /></div>
              <div className="space-y-2"><Label>Description (ES)</Label><Textarea value={form.description_es} onChange={(e) => setForm({ ...form, description_es: e.target.value })} className="bg-secondary" /></div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: c })} />
                <Label>Active</Label>
              </div>
              <Button type="submit" disabled={save.isPending} className="w-full bg-gradient-gold text-primary-foreground">
                {save.isPending ? '...' : 'Save'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead>Name (EN)</TableHead>
              <TableHead>Name (ES)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map((m: any) => (
              <TableRow key={m.id} className="border-border">
                <TableCell className="font-medium">{m.name_en}</TableCell>
                <TableCell>{m.name_es}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${m.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {m.is_active ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(m.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {materials.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No materials yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
