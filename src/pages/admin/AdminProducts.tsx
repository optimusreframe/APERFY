import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Image, Sparkles, Link2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface ProductForm {
  name_en: string;
  name_es: string;
  description_en: string;
  description_es: string;
  slug: string;
  base_price: number;
  category_id: string;
  is_active: boolean;
  is_featured: boolean;
}

const empty: ProductForm = {
  name_en: '', name_es: '', description_en: '', description_es: '',
  slug: '', base_price: 0, category_id: '', is_active: true, is_featured: false,
};

export default function AdminProducts() {
  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(empty);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [aiUrl, setAiUrl] = useState('');
  const [aiDesc, setAiDesc] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();
  const { language } = useLanguage();

  const { data: products = [] } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*, categories(name_en, name_es)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').eq('is_active', true).order('name_en');
      if (error) throw error;
      return data;
    },
  });

  const uploadImage = async (file: File, productId: string): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `${productId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
  };

  const save = useMutation({
    mutationFn: async (f: ProductForm) => {
      const payload = { ...f, category_id: f.category_id || null, base_price: Number(f.base_price) };
      let productId = editId;

      if (editId) {
        const { error } = await supabase.from('products').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('products').insert({ ...payload, images: [] }).select('id').single();
        if (error) throw error;
        productId = data.id;
      }

      if (imageFile && productId) {
        const url = await uploadImage(imageFile, productId);
        const { data: product } = await supabase.from('products').select('images').eq('id', productId).single();
        const images = [...((product?.images as string[]) || []), url];
        await supabase.from('products').update({ images }).eq('id', productId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['admin-product-count'] });
      setOpen(false);
      setEditId(null);
      setForm(empty);
      setImageFile(null);
      toast({ title: '✓', description: 'Product saved.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['admin-product-count'] });
      toast({ title: '✓', description: 'Product deleted.' });
    },
  });

  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      name_en: p.name_en, name_es: p.name_es,
      description_en: p.description_en || '', description_es: p.description_es || '',
      slug: p.slug, base_price: p.base_price,
      category_id: p.category_id || '', is_active: p.is_active, is_featured: p.is_featured,
    });
    setOpen(true);
  };

  const handleAiGenerate = async () => {
    if (!aiUrl && !aiDesc) {
      toast({ title: 'Error', description: 'Provide a URL or description', variant: 'destructive' });
      return;
    }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-product-from-url', {
        body: { url: aiUrl, description: aiDesc },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'AI generation failed');

      const d = data.data;
      // Find matching category
      const catSlug = d.suggested_category;
      const matchedCat = categories.find((c: any) => c.slug === catSlug);

      setForm({
        name_en: d.name_en || '',
        name_es: d.name_es || '',
        description_en: d.description_en || '',
        description_es: d.description_es || '',
        slug: d.slug || '',
        base_price: d.suggested_price || 0,
        category_id: matchedCat?.id || '',
        is_active: true,
        is_featured: false,
      });
      setAiOpen(false);
      setOpen(true);
      toast({ title: '✓', description: 'AI generated product data. Review and save.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Products</h1>
        <div className="flex gap-2">
          {/* AI Import Dialog */}
          <Dialog open={aiOpen} onOpenChange={setAiOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
                <Sparkles className="w-4 h-4" />
                Add from Reference
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI Product Import
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Link2 className="w-4 h-4" />Reference URL</Label>
                  <Input
                    value={aiUrl}
                    onChange={(e) => setAiUrl(e.target.value)}
                    placeholder="https://www.thingiverse.com/thing/..."
                    className="bg-secondary"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Additional Description</Label>
                  <Textarea
                    value={aiDesc}
                    onChange={(e) => setAiDesc(e.target.value)}
                    placeholder="Describe the product or paste additional info..."
                    className="bg-secondary"
                    rows={4}
                  />
                </div>
                <Button
                  onClick={handleAiGenerate}
                  disabled={aiLoading || (!aiUrl && !aiDesc)}
                  className="w-full bg-gradient-gold text-primary-foreground gap-2"
                >
                  {aiLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate with AI
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  AI will generate bilingual product data for you to review before saving.
                </p>
              </div>
            </DialogContent>
          </Dialog>

          {/* Standard Add Dialog */}
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setForm(empty); setImageFile(null); } }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-gold text-primary-foreground gap-2"><Plus className="w-4 h-4" />Add Product</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-display">{editId ? 'Edit' : 'Add'} Product</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Name (EN)</Label><Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} className="bg-secondary" required /></div>
                  <div className="space-y-2"><Label>Name (ES)</Label><Input value={form.name_es} onChange={(e) => setForm({ ...form, name_es: e.target.value })} className="bg-secondary" required /></div>
                </div>
                <div className="space-y-2"><Label>Description (EN)</Label><Textarea value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} className="bg-secondary" rows={3} /></div>
                <div className="space-y-2"><Label>Description (ES)</Label><Textarea value={form.description_es} onChange={(e) => setForm({ ...form, description_es: e.target.value })} className="bg-secondary" rows={3} /></div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="bg-secondary" required /></div>
                  <div className="space-y-2"><Label>Base Price ($)</Label><Input type="number" step="0.01" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: parseFloat(e.target.value) || 0 })} className="bg-secondary" required /></div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                      <SelectTrigger className="bg-secondary"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{language === 'es' ? c.name_es : c.name_en}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Product Image</Label>
                  <div className="flex items-center gap-2">
                    <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="bg-secondary" />
                    <Image className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: c })} /><Label>Active</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={form.is_featured} onCheckedChange={(c) => setForm({ ...form, is_featured: c })} /><Label>Featured</Label></div>
                </div>
                <Button type="submit" disabled={save.isPending} className="w-full bg-gradient-gold text-primary-foreground">
                  {save.isPending ? '...' : 'Save Product'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p: any) => (
              <TableRow key={p.id} className="border-border">
                <TableCell>
                  <div className="flex items-center gap-3">
                    {(p.images as string[])?.length > 0 ? (
                      <img src={(p.images as string[])[0]} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center"><Image className="w-4 h-4 text-muted-foreground" /></div>
                    )}
                    <div>
                      <p className="font-medium">{language === 'es' ? p.name_es : p.name_en}</p>
                      <p className="text-xs text-muted-foreground">{p.slug}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.categories ? (language === 'es' ? p.categories.name_es : p.categories.name_en) : '—'}
                </TableCell>
                <TableCell className="font-medium">${Number(p.base_price).toFixed(2)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${p.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {p.is_featured && <span className="px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary">★</span>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(p.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {products.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No products yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
