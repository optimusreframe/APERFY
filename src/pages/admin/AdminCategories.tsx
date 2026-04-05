import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/lib/activity-log';

interface CategoryForm {
  name_en: string;
  name_es: string;
  slug: string;
  icon: string;
  is_active: boolean;
}

const empty: CategoryForm = { name_en: '', name_es: '', slug: '', icon: 'Box', is_active: true };

export default function AdminCategories() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(empty);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (f: CategoryForm) => {
      if (editId) {
        const { error } = await supabase.from('categories').update(f).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('categories').insert(f);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      qc.invalidateQueries({ queryKey: ['admin-category-count'] });
      setOpen(false);
      setEditId(null);
      setForm(empty);
      toast({ title: '✓', description: 'Category saved.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      qc.invalidateQueries({ queryKey: ['admin-category-count'] });
      toast({ title: '✓', description: 'Category deleted.' });
    },
  });

  const openEdit = (cat: any) => {
    setEditId(cat.id);
    setForm({ name_en: cat.name_en, name_es: cat.name_es, slug: cat.slug, icon: cat.icon || 'Box', is_active: cat.is_active });
    setOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Categories</h1>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm(empty); } }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-gold text-primary-foreground gap-2"><Plus className="w-4 h-4" />Add Category</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle className="font-display">{editId ? 'Edit' : 'Add'} Category</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Name (EN)</Label><Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} className="bg-secondary" required /></div>
                <div className="space-y-2"><Label>Name (ES)</Label><Input value={form.name_es} onChange={(e) => setForm({ ...form, name_es: e.target.value })} className="bg-secondary" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="bg-secondary" required /></div>
                <div className="space-y-2"><Label>Icon</Label><Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="bg-secondary" /></div>
              </div>
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
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((cat: any) => (
              <TableRow key={cat.id} className="border-border">
                <TableCell className="font-medium">{cat.name_en}</TableCell>
                <TableCell>{cat.name_es}</TableCell>
                <TableCell className="text-muted-foreground">{cat.slug}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${cat.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {cat.is_active ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(cat.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {categories.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No categories yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
