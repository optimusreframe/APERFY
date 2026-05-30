import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Sparkles, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { AdminPageHeader } from './_shared';

const KEYS = ['ai_3d_tripo_enabled', 'ai_3d_render_enabled'] as const;

export default function AdminAI3DSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tripoEnabled, setTripoEnabled] = useState(false);
  const [renderEnabled, setRenderEnabled] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-ai3d-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [...KEYS]);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!data) return;
    for (const row of data) {
      if (row.setting_key === 'ai_3d_tripo_enabled') setTripoEnabled(row.setting_value === 'true');
      if (row.setting_key === 'ai_3d_render_enabled') setRenderEnabled(row.setting_value === 'true');
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      await Promise.all([
        supabase.from('admin_settings').update({ setting_value: String(tripoEnabled) }).eq('setting_key', 'ai_3d_tripo_enabled'),
        supabase.from('admin_settings').update({ setting_value: String(renderEnabled) }).eq('setting_key', 'ai_3d_render_enabled'),
      ]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-ai3d-settings'] });
      qc.invalidateQueries({ queryKey: ['ai3d-public-settings'] });
      toast({ title: '✓', description: 'AI 3D settings updated.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <AdminPageHeader
        eyebrow="catalog · ai 3d"
        title="AI 3D Generation"
        meta="Configura cómo se generan los modelos / renders 3D para los productos."
        actions={
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2">
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </Button>
        }
      />

      <div className="space-y-4">
        {/* Tripo3D */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Tripo3D · text-to-3D real (.glb)</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Genera modelos 3D reales en formato <code>.glb</code> a partir de una descripción de texto.
                  Usa la API de Tripo3D (~$0.05–0.20 por modelo, ~1–3 min por generación).
                </p>
              </div>
            </div>
            <Switch checked={tripoEnabled} onCheckedChange={setTripoEnabled} />
          </div>
          <div className="text-xs text-muted-foreground/80 pl-13 ml-1">
            Requiere <code>TRIPO_API_KEY</code> configurada como secret.
            <a href="https://platform.tripo3d.ai" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline ml-1">
              Obtener API key <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Lovable AI Render */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                <ImageIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Render 3D estático · Lovable AI</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Genera un render fotorrealista del producto desde una descripción.
                  No es un modelo 3D real (no rotable), pero es rápido, barato y se añade como imagen principal.
                </p>
              </div>
            </div>
            <Switch checked={renderEnabled} onCheckedChange={setRenderEnabled} />
          </div>
          <div className="text-xs text-muted-foreground/80 pl-13 ml-1">
            Usa el AI Gateway integrado, sin configuración adicional.
          </div>
        </div>
      </div>
    </div>
  );
}
