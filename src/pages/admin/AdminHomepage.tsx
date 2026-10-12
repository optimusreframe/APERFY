import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Languages, LayoutTemplate, Loader2, Save } from 'lucide-react';
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

const CONTENT_FIELD_NAMES = ['eyebrow', 'title', 'highlight', 'description', 'primary_cta', 'secondary_cta'] as const;
type ContentFieldName = typeof CONTENT_FIELD_NAMES[number];
type TranslationDirection = 'es_to_en' | 'en_to_es';

export default function AdminHomepage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<HomepageHeroConfig>(DEFAULT_HOMEPAGE_HERO_CONFIG);
  const [translating, setTranslating] = useState<TranslationDirection | null>(null);

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

  const translateContent = async (direction: TranslationDirection) => {
    const sourceLocale = direction === 'es_to_en' ? 'es' : 'en';
    const targetLocale = direction === 'es_to_en' ? 'en' : 'es';
    const fields = Object.fromEntries(CONTENT_FIELD_NAMES.map((name) => [name, config[`${name}_${sourceLocale}` as keyof HomepageHeroConfig]]));
    if (!Object.values(fields).some((value) => String(value || '').trim())) {
      toast({ title: 'CONTENIDO VACÍO', description: 'Escribe primero el contenido del idioma de origen.', variant: 'destructive' });
      return;
    }
    setTranslating(direction);
    try {
      const { data, error } = await supabase.functions.invoke('ai-product-import', {
        body: { action: 'translate_content', direction, fields },
      });
      if (error) throw error;
      if (!data?.success || !data.data) throw new Error(data?.error || 'No se pudo traducir el contenido.');
      setConfig((current) => {
        const next = { ...current };
        for (const name of CONTENT_FIELD_NAMES) {
          const value = data.data[name as ContentFieldName];
          if (typeof value === 'string' && value.trim()) next[`${name}_${targetLocale}` as keyof HomepageHeroConfig] = value.trim() as never;
        }
        return next;
      });
      toast({ title: 'TRADUCCIÓN LISTA', description: `Contenido generado en ${targetLocale === 'en' ? 'English' : 'Español'}. Revisa y guarda los cambios.` });
    } catch (error) {
      toast({ title: 'ERROR DE TRADUCCIÓN', description: error instanceof Error ? error.message : 'No se pudo traducir el contenido.', variant: 'destructive' });
    } finally {
      setTranslating(null);
    }
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
          const direction: TranslationDirection = locale === 'es' ? 'es_to_en' : 'en_to_es';
          const targetLabel = locale === 'es' ? 'ENGLISH' : 'ESPAÑOL';
          return <AdminSurface key={locale} className="p-5 md:p-6">
            <div className="flex flex-col gap-3 border-b border-white/[0.08] pb-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-mono uppercase tracking-[.2em] text-primary">{locale === 'es' ? 'Contenido público' : 'Public content'}</p><h2 className="mt-1 font-semibold uppercase">{locale === 'es' ? 'ESPAÑOL' : 'ENGLISH'}</h2></div><Button type="button" size="sm" variant="outline" className="w-full gap-1.5 text-[10px] uppercase sm:w-auto" onClick={() => void translateContent(direction)} disabled={translating !== null}><Languages className="h-3.5 w-3.5" />{translating === direction ? 'TRADUCIENDO' : `TRADUCIR A ${targetLabel}`}</Button></div>
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
