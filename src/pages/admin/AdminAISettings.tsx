import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, KeyRound, Loader2, Save, Search, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { AdminPageHeader, AdminSurface } from './_shared';

const KEYS = ['ai_provider', 'ai_model', 'ai_search_enabled', 'ai_discount_percent', 'ai_provider_key_status'] as const;

export default function AdminAISettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [provider, setProvider] = useState('lovable-gateway');
  const [model, setModel] = useState('google/gemini-3.1-flash-image-preview');
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [discount, setDiscount] = useState('20');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-ai-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('admin_settings').select('setting_key, setting_value').in('setting_key', [...KEYS]);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    for (const row of data || []) {
      if (row.setting_key === 'ai_provider') setProvider(row.setting_value || provider);
      if (row.setting_key === 'ai_model') setModel(row.setting_value || model);
      if (row.setting_key === 'ai_search_enabled') setSearchEnabled(row.setting_value === 'true');
      if (row.setting_key === 'ai_discount_percent') setDiscount(row.setting_value || '20');
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const percent = Math.min(90, Math.max(0, Number(discount) || 20));
      const values = { ai_provider: provider, ai_model: model, ai_search_enabled: String(searchEnabled), ai_discount_percent: String(percent) };
      for (const [setting_key, setting_value] of Object.entries(values)) {
        const { error } = await supabase.from('admin_settings').upsert({ setting_key, setting_value }, { onConflict: 'setting_key' });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-ai-settings'] }); toast({ title: 'GUARDADO', description: 'Configuración de inteligencia APERFY actualizada.' }); },
    onError: (error: any) => toast({ title: 'ERROR', description: error.message, variant: 'destructive' }),
  });

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const keyStatus = data?.find(row => row.setting_key === 'ai_provider_key_status')?.setting_value === 'configured';
  return <div className="mx-auto max-w-4xl space-y-6">
    <AdminPageHeader eyebrow="SYSTEM · AI PRODUCT INTELLIGENCE" title="AI SETTINGS" meta="CONFIGURA EL MOTOR QUE APOYA LA CREACIÓN DE PRODUCTOS" actions={<Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2 uppercase">{save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} GUARDAR</Button>} />
    <AdminSurface className="p-5 md:p-6">
      <div className="flex items-start gap-3 border-b border-white/[0.08] pb-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary"><Sparkles className="h-5 w-5" /></div><div><h2 className="font-semibold uppercase">PROVEEDOR DE IA</h2><p className="mt-1 text-sm text-muted-foreground">Las credenciales se leen exclusivamente desde secretos de Supabase Edge Functions.</p></div></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label className="uppercase tracking-wider">PROVIDER</Label><Input value={provider} onChange={e => setProvider(e.target.value)} className="border-white/10 bg-black/20" placeholder="lovable-gateway" /></div><div className="space-y-2"><Label className="uppercase tracking-wider">MODEL</Label><Input value={model} onChange={e => setModel(e.target.value)} className="border-white/10 bg-black/20" /></div></div>
      <div className="mt-5 flex items-center justify-between rounded-xl border border-white/[0.08] bg-black/20 p-4"><div className="flex items-center gap-3"><KeyRound className="h-4 w-4 text-primary" /><div><p className="text-sm font-medium uppercase">PROVIDER API KEY</p><p className="text-xs text-muted-foreground">{keyStatus ? 'SECRET CONFIGURADO EN EDGE FUNCTIONS' : 'PENDIENTE DE CONFIGURAR EN SUPABASE'}</p></div></div><span className={`rounded-full px-2 py-1 text-[10px] font-mono uppercase ${keyStatus ? 'bg-primary/15 text-primary' : 'bg-white/10 text-muted-foreground'}`}>{keyStatus ? 'READY' : 'NOT SET'}</span></div>
    </AdminSurface>
    <AdminSurface className="p-5 md:p-6"><div className="flex items-start gap-3"><Search className="mt-1 h-4 w-4 text-primary" /><div><h2 className="font-semibold uppercase">MARKET REFERENCE</h2><p className="mt-1 text-sm text-muted-foreground">Analiza fotos, identifica el producto y calcula una recomendación basada en el precio de mercado.</p></div></div><div className="mt-5 grid gap-4 md:grid-cols-[1fr_180px] md:items-end"><div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-black/20 p-4"><div><p className="text-sm font-medium uppercase">BUSCAR REFERENCIAS</p><p className="mt-1 text-xs text-muted-foreground">ACTIVA LA BÚSQUEDA CUANDO EL API ESTÉ CONFIGURADO.</p></div><Switch checked={searchEnabled} onCheckedChange={setSearchEnabled} /></div><div className="space-y-2"><Label className="uppercase tracking-wider">DESCUENTO SUGERIDO (%)</Label><Input type="number" min="0" max="90" value={discount} onChange={e => setDiscount(e.target.value)} className="border-white/10 bg-black/20 font-mono text-primary" /></div></div></AdminSurface>
    <div className="flex items-center gap-2 text-xs text-muted-foreground"><Eye className="h-3.5 w-3.5" /> Las claves nunca se muestran ni se guardan en el navegador.</div>
  </div>;
}
