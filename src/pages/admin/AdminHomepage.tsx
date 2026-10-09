import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, LayoutTemplate, Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  DEFAULT_HOMEPAGE_HERO_CONFIG,
  HOMEPAGE_HERO_SETTING_KEY,
  parseHomepageHeroConfig,
  serializeHomepageHeroConfig,
  type HomepageHeroConfig,
} from '@/lib/homepage-settings';
import { AdminPageHeader, AdminSurface } from './_shared';

const COPY_FIELDS: Array<{ key: keyof Omit<HomepageHeroConfig, 'enabled'>; label: string; maxLength: number; multiline?: boolean }> = [
  { key: 'eyebrow_es', label: 'Eyebrow / etiqueta superior', maxLength: 80 },
  { key: 'title_es', label: 'Título', maxLength: 100 },
  { key: 'highlight_es', label: 'Texto destacado', maxLength: 120 },
  { key: 'description_es', label: 'Descripción', maxLength: 500, multiline: true },
  { key: 'primary_cta_es', label: 'Botón principal', maxLength: 50 },
  { key: 'secondary_cta_es', label: 'Botón secundario', maxLength: 50 },
  { key: 'eyebrow_en', label: 'Eyebrow / top label', maxLength: 80 },
  { key: 'title_en', label: 'Title', maxLength: 100 },
  { key: 'highlight_en', label: 'Highlighted text', maxLength: 120 },
  { key: 'description_en', label: 'Description', maxLength: 500, multiline: true },
  { key: 'primary_cta_en', label: 'Primary button', maxLength: 50 },
  { key: 'secondary_cta_en', label: 'Secondary button', maxLength: 50 },
];

export default function AdminHomepage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<HomepageHeroConfig>(DEFAULT_HOMEPAGE_HERO_CONFIG);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-homepage-hero-settings'],
    queryFn: async () => {
      const { data: row, error } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', HOMEPAGE_HERO_SETTING_KEY)
        .maybeSingle();
      if (error) throw error;
      return parseHomepageHeroConfig(row?.setting_value);
    },
  });

  useEffect(() => {
    if (data) setConfig(data);
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('admin_settings').upsert({
        setting_key: HOMEPAGE_HERO_SETTING_KEY,
        setting_value: serializeHomepageHeroConfig(config),
      }, { onConflict: 'setting_key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-homepage-hero-settings'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-hero-settings'] });
      toast({ title: 'GUARDADO', description: 'La sección de inicio fue actualizada.' });
    },
    onError: (error: unknown) => toast({ title: 'ERROR', description: error instanceof Error ? error.message : 'No se pudo guardar la configuración.', variant: 'destructive' }),
  });

  const updateField = (key: keyof HomepageHeroConfig, value: string | boolean) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (isError) return <AdminSurface className="mx-auto flex max-w-2xl flex-col items-center gap-4 p-8 text-center"><p className="font-semibold uppercase">NO SE PUDO CARGAR HOME PAGE</p><p className="text-sm text-muted-foreground">No se muestran valores editables hasta confirmar la lectura actual de Supabase.</p><Button variant="outline" onClick={() => refetch()}>REINTENTAR</Button></AdminSurface>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader
        eyebrow="MERCHANDISING · HOME"
        title="HOME PAGE"
        meta="CONFIGURA LA SECCIÓN DESTACADA DE LA PÁGINA DE INICIO"
        actions={<Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2 uppercase"><Save className="h-4 w-4" />{save.isPending ? 'GUARDANDO' : 'GUARDAR'}</Button>}
      />

      <AdminSurface className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary"><LayoutTemplate className="h-5 w-5" /></div>
            <div><h2 className="font-semibold uppercase">SECCIÓN DESTACADA</h2><p className="mt-1 text-sm text-muted-foreground">Puedes ocultarla ahora y reactivarla cuando el contenido esté listo. Los cambios se reflejan en la página pública.</p></div>
          </div>
          <div className="flex shrink-0 items-center gap-2"><Label htmlFor="homepage-hero-enabled" className="text-xs uppercase text-muted-foreground">Activa</Label><Switch id="homepage-hero-enabled" checked={config.enabled} onCheckedChange={(value) => updateField('enabled', value)} /></div>
        </div>
        <div className={`mt-5 flex items-center gap-2 rounded-xl border p-3 text-xs ${config.enabled ? 'border-primary/25 bg-primary/5 text-primary' : 'border-white/[0.08] bg-black/20 text-muted-foreground'}`}><Eye className="h-4 w-4" />{config.enabled ? 'VISIBLE EN LA PÁGINA DE INICIO' : 'OCULTA EN LA PÁGINA DE INICIO · ESTADO ACTUAL'}</div>
      </AdminSurface>

      <div className="grid gap-6 lg:grid-cols-2">
        {(['es', 'en'] as const).map((locale) => {
          const fields = COPY_FIELDS.filter(({ key }) => key.endsWith(`_${locale}`));
          return <AdminSurface key={locale} className="p-5 md:p-6">
            <div className="border-b border-white/[0.08] pb-4"><p className="text-[10px] font-mono uppercase tracking-[.2em] text-primary">{locale === 'es' ? 'Contenido público' : 'Public content'}</p><h2 className="mt-1 font-semibold uppercase">{locale === 'es' ? 'ESPAÑOL' : 'ENGLISH'}</h2></div>
            <div className="mt-5 space-y-4">
              {fields.map(({ key, label, maxLength, multiline }) => <div key={key} className="space-y-2"><Label htmlFor={`homepage-${key}`} className="text-xs uppercase tracking-wider">{label}</Label>{multiline ? <Textarea id={`homepage-${key}`} value={config[key]} onChange={(event) => updateField(key, event.target.value)} className="min-h-28 border-white/10 bg-black/20" maxLength={maxLength} /> : <Input id={`homepage-${key}`} value={config[key]} onChange={(event) => updateField(key, event.target.value)} className="border-white/10 bg-black/20" maxLength={maxLength} />}</div>)}
            </div>
          </AdminSurface>;
        })}
      </div>

      <AdminSurface className="p-5 md:p-6">
        <div className="flex items-start gap-3"><Eye className="mt-0.5 h-4 w-4 text-primary" /><div><h2 className="font-semibold uppercase">ACCIONES FIJAS</h2><p className="mt-1 text-sm text-muted-foreground">El botón principal lleva al catálogo y el secundario a Solicitar un producto. Así puedes cambiar el texto sin romper la navegación.</p></div></div>
      </AdminSurface>
    </div>
  );
}
