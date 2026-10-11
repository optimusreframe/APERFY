import { useEffect, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ExternalLink, Globe2, ImagePlus, Loader2, Save, SearchCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { AdminPageHeader, AdminSurface } from './_shared';
import { useSeoSettings } from '@/contexts/SeoContext';
import { DEFAULT_SEO_SETTINGS, SEO_SETTINGS_KEY, parseSeoSettings, serializeSeoSettings, type SeoSettings } from '@/lib/seo-settings';

type ImageFieldProps = {
  id: keyof Pick<SeoSettings, 'default_image_url' | 'home_image_url' | 'request_image_url' | 'contact_image_url' | 'auth_image_url'>;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>, field: ImageFieldProps['id']) => void;
  uploading: string | null;
};

function ImageField({ id, label, value, onChange, onUpload, uploading }: ImageFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`seo-${id}`} className="text-xs uppercase tracking-wider">{label}</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input id={`seo-${id}`} value={value} onChange={(event) => onChange(event.target.value)} placeholder="https://..." className="min-w-0 flex-1" />
        <label className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-secondary px-3 text-xs font-medium hover:bg-secondary/80">
          {uploading === id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          SUBIR IMAGEN
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => onUpload(event, id)} disabled={uploading !== null} />
        </label>
      </div>
      {value && <img src={value} alt="Vista previa social" className="h-24 w-full rounded-xl border border-border object-cover" />}
    </div>
  );
}

export default function AdminSeo() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { refresh: refreshPublicSeo } = useSeoSettings();
  const [config, setConfig] = useState<SeoSettings>(DEFAULT_SEO_SETTINGS);
  const [uploading, setUploading] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-seo-settings'],
    queryFn: async () => {
      const { data: row, error } = await supabase.from('admin_settings').select('setting_value').eq('setting_key', SEO_SETTINGS_KEY).maybeSingle();
      if (error) throw error;
      return parseSeoSettings(row?.setting_value);
    },
  });

  useEffect(() => { if (data) setConfig(data); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('admin_settings').upsert({ setting_key: SEO_SETTINGS_KEY, setting_value: serializeSeoSettings(config) }, { onConflict: 'setting_key' });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-seo-settings'] });
      await refreshPublicSeo();
      window.dispatchEvent(new Event('aperfy-seo-settings-updated'));
      toast({ title: 'GUARDADO', description: 'SEO y previews sociales actualizados.' });
    },
    onError: (error: unknown) => toast({ title: 'ERROR', description: error instanceof Error ? error.message : 'No se pudo guardar SEO.', variant: 'destructive' }),
  });

  const update = (key: keyof SeoSettings, value: string | boolean) => setConfig((current) => ({ ...current, [key]: value }));

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>, field: ImageFieldProps['id']) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) {
      toast({ title: 'IMAGEN NO VÁLIDA', description: 'Usa PNG, JPG o WebP de máximo 8 MB.', variant: 'destructive' });
      return;
    }
    setUploading(field);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `seo/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from('site-assets').upload(path, file, { cacheControl: '3600', contentType: file.type, upsert: false });
      if (error) throw error;
      const { data: publicUrl } = supabase.storage.from('site-assets').getPublicUrl(path);
      update(field, publicUrl.publicUrl);
    } catch (error: unknown) {
      toast({ title: 'ERROR AL SUBIR', description: error instanceof Error ? error.message : 'No se pudo subir la imagen.', variant: 'destructive' });
    } finally {
      setUploading(null);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (isError) return <AdminSurface className="mx-auto flex max-w-2xl flex-col items-center gap-4 p-8 text-center"><p className="font-semibold uppercase">NO SE PUDO CARGAR SEO</p><Button variant="outline" onClick={() => refetch()}>REINTENTAR</Button></AdminSurface>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminPageHeader eyebrow="SYSTEM · DISCOVERY" title="SEO & SOCIAL" meta="CONFIGURA GOOGLE, BUSCADORES Y PREVIEWS AL COMPARTIR" actions={<Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2 uppercase"><Save className="h-4 w-4" />{save.isPending ? 'GUARDANDO' : 'GUARDAR SEO'}</Button>} />

      <AdminSurface className="p-5 md:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary"><SearchCheck className="h-5 w-5" /></div>
          <div><h2 className="font-semibold uppercase">PREVIEWS INTELIGENTES</h2><p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">Los productos usan automáticamente su primera imagen publicada. Para la home y páginas generales se usa la imagen que configures aquí. WhatsApp, Telegram, Facebook y buscadores reciben una vista server-side compatible con crawlers.</p></div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/[0.06] p-3 text-xs text-primary"><Check className="h-4 w-4" />PRODUCTOS · IMAGEN PRINCIPAL AUTOMÁTICA <span className="text-muted-foreground">|</span><Globe2 className="h-4 w-4" />PÁGINAS · IMAGEN CONFIGURABLE</div>
      </AdminSurface>

      <AdminSurface className="p-5 md:p-6">
        <div className="mb-5 border-b border-border pb-4"><h2 className="font-semibold uppercase">IDENTIDAD Y GOOGLE</h2><p className="mt-1 text-sm text-muted-foreground">Controla títulos, descripciones, canonical y la verificación de Search Console.</p></div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="seo-site-name" className="text-xs uppercase tracking-wider">Nombre del sitio</Label><Input id="seo-site-name" value={config.site_name} onChange={(event) => update('site_name', event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="seo-canonical" className="text-xs uppercase tracking-wider">URL canónica base</Label><Input id="seo-canonical" value={config.canonical_url} onChange={(event) => update('canonical_url', event.target.value)} placeholder="https://aperfy.kpwr.dev" /></div>
          <div className="space-y-2"><Label htmlFor="seo-title-es" className="text-xs uppercase tracking-wider">Título SEO · Español</Label><Input id="seo-title-es" value={config.title_es} onChange={(event) => update('title_es', event.target.value)} maxLength={160} /></div>
          <div className="space-y-2"><Label htmlFor="seo-title-en" className="text-xs uppercase tracking-wider">SEO title · English</Label><Input id="seo-title-en" value={config.title_en} onChange={(event) => update('title_en', event.target.value)} maxLength={160} /></div>
          <div className="space-y-2"><Label htmlFor="seo-description-es" className="text-xs uppercase tracking-wider">Descripción · Español</Label><Textarea id="seo-description-es" value={config.description_es} onChange={(event) => update('description_es', event.target.value)} maxLength={320} className="min-h-24" /></div>
          <div className="space-y-2"><Label htmlFor="seo-description-en" className="text-xs uppercase tracking-wider">Description · English</Label><Textarea id="seo-description-en" value={config.description_en} onChange={(event) => update('description_en', event.target.value)} maxLength={320} className="min-h-24" /></div>
          <div className="space-y-2"><Label htmlFor="seo-verification" className="text-xs uppercase tracking-wider">Google Search Console verification</Label><Input id="seo-verification" value={config.google_site_verification} onChange={(event) => update('google_site_verification', event.target.value)} placeholder="Código content de Google" /></div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4"><div><Label htmlFor="seo-robots" className="text-xs uppercase tracking-wider">Indexar el sitio</Label><p className="mt-1 text-xs text-muted-foreground">Controla la directiva robots index/follow.</p></div><Switch id="seo-robots" checked={config.robots_index} onCheckedChange={(value) => update('robots_index', value)} /></div>
        </div>
      </AdminSurface>

      <AdminSurface className="p-5 md:p-6">
        <div className="mb-5 border-b border-border pb-4"><h2 className="font-semibold uppercase">IMÁGENES SOCIALES</h2><p className="mt-1 text-sm text-muted-foreground">Recomendado: imágenes JPG, PNG o WebP de 1200 × 630 px. Si una página queda vacía, usa la imagen por defecto.</p></div>
        <div className="grid gap-5 lg:grid-cols-2">
          <ImageField id="default_image_url" label="Imagen por defecto · páginas generales" value={config.default_image_url} onChange={(value) => update('default_image_url', value)} onUpload={uploadImage} uploading={uploading} />
          <ImageField id="home_image_url" label="Home / catálogo" value={config.home_image_url} onChange={(value) => update('home_image_url', value)} onUpload={uploadImage} uploading={uploading} />
          <ImageField id="request_image_url" label="Solicitar producto" value={config.request_image_url} onChange={(value) => update('request_image_url', value)} onUpload={uploadImage} uploading={uploading} />
          <ImageField id="contact_image_url" label="Contacto" value={config.contact_image_url} onChange={(value) => update('contact_image_url', value)} onUpload={uploadImage} uploading={uploading} />
          <ImageField id="auth_image_url" label="Login / registro" value={config.auth_image_url} onChange={(value) => update('auth_image_url', value)} onUpload={uploadImage} uploading={uploading} />
        </div>
      </AdminSurface>

      <AdminSurface className="p-5 md:p-6"><div className="flex items-start gap-3"><ExternalLink className="mt-0.5 h-4 w-4 text-primary" /><div><h2 className="font-semibold uppercase">RECURSOS PUBLICADOS</h2><p className="mt-1 text-sm text-muted-foreground">Sitemap: <a className="text-primary underline" href="/api/sitemap" target="_blank" rel="noreferrer">/api/sitemap</a> · robots.txt: <a className="text-primary underline" href="/robots.txt" target="_blank" rel="noreferrer">/robots.txt</a></p></div></div></AdminSurface>
    </div>
  );
}
