import { useEffect, useMemo, useState } from 'react';
import { BellRing, Code2, Eye, Loader2, Mail, MessageCircle, Save, Send, Smartphone, Variable } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { AdminPageHeader, AdminSurface } from './_shared';
import type { Database } from '@/integrations/supabase/types';

type Template = Database['public']['Tables']['notification_templates']['Row'];
type Channel = 'email' | 'telegram' | 'whatsapp' | 'push' | 'in_app';
type Draft = Pick<Template, 'name' | 'subject' | 'body_text' | 'body_html' | 'enabled'>;

const CHANNELS: Array<{ value: Channel; label: string; icon: typeof Mail }> = [
  { value: 'email', label: 'EMAIL', icon: Mail },
  { value: 'telegram', label: 'TELEGRAM', icon: Send },
  { value: 'whatsapp', label: 'WHATSAPP', icon: MessageCircle },
  { value: 'push', label: 'PUSH', icon: Smartphone },
  { value: 'in_app', label: 'IN-APP', icon: BellRing },
];

const fallbackVariables = ['customer_name', 'order_code', 'total', 'payment_method', 'items_summary', 'shipping_address', 'phone', 'email', 'logo_url'];

const initialDraft: Draft = { name: '', subject: '', body_text: '', body_html: '', enabled: true };

function replacePreview(template: string, draft: Draft): string {
  const values: Record<string, string> = {
    customer_name: 'Andres Pernia', order_code: '8B960216', total: '$30.00', payment_method: 'WhatsApp',
    items_summary: 'Anker Nano Charger ×1', shipping_address: '11609 S Orange Blossom Tr, Orlando, FL 32837',
    phone: '+1 555 555 0123', email: 'andres@example.com', logo_url: 'https://aperfy.kpwr.dev/logo.png',
  };
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => values[key] || `{{${key}}}`);
}

export default function AdminNotifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [channel, setChannel] = useState<Channel>('email');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [activeField, setActiveField] = useState<'subject' | 'body_text' | 'body_html'>('body_text');

  const { data: templates = [], isLoading, isError, error } = useQuery({
    queryKey: ['admin-notification-templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('notification_templates').select('*').order('channel').order('event_key').order('locale');
      if (error) throw error;
      return data as Template[];
    },
  });

  const channelTemplates = useMemo(() => templates.filter((template) => template.channel === channel), [templates, channel]);
  const selected = channelTemplates.find((template) => template.id === selectedId) || channelTemplates[0];

  useEffect(() => {
    if (selected?.id !== selectedId) setSelectedId(selected?.id || null);
  }, [selected, selectedId]);

  useEffect(() => {
    if (!selected) { setDraft(initialDraft); return; }
    setDraft({ name: selected.name, subject: selected.subject || '', body_text: selected.body_text, body_html: selected.body_html || '', enabled: selected.enabled });
  }, [selected]);

  const save = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('Selecciona una plantilla');
      const { error } = await supabase.from('notification_templates').update(draft).eq('id', selected.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notification-templates'] });
      toast({ title: 'PLANTILLA GUARDADA', description: 'Los cambios quedan disponibles para el siguiente envío.' });
    },
    onError: (saveError: unknown) => toast({ title: 'NO SE PUDO GUARDAR', description: saveError instanceof Error ? saveError.message : 'Revisa la migración y los permisos de administrador.', variant: 'destructive' }),
  });

  const appendVariable = (variable: string) => {
    const token = `{{${variable}}}`;
    setDraft((current) => ({ ...current, [activeField]: `${current[activeField] || ''}${current[activeField] ? ' ' : ''}${token}` }));
  };

  const variableList = selected?.variables && Array.isArray(selected.variables)
    ? selected.variables.filter((value): value is string => typeof value === 'string')
    : fallbackVariables;
  const previewSource = channel === 'email' && draft.body_html ? draft.body_html : draft.body_text;

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (isError) return <AdminSurface className="mx-auto max-w-2xl p-8 text-center"><p className="font-semibold uppercase">NO SE PUDIERON CARGAR LAS PLANTILLAS</p><p className="mt-2 text-sm text-muted-foreground">Aplica la migración `notification_templates` y vuelve a cargar.</p><p className="mt-3 text-xs text-destructive">{error instanceof Error ? error.message : 'Supabase query failed'}</p></AdminSurface>;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <AdminPageHeader
        eyebrow="system · communications"
        title="Notification Studio"
        meta="EDITA EMAIL, TELEGRAM, WHATSAPP, PUSH E IN-APP SIN CAMBIAR CÓDIGO"
        actions={<Button onClick={() => save.mutate()} disabled={!selected || save.isPending} className="gap-2 uppercase"><Save className="h-4 w-4" />{save.isPending ? 'GUARDANDO' : 'GUARDAR'}</Button>}
      />

      <div className="grid gap-5 xl:grid-cols-[240px_300px_minmax(0,1fr)]">
        <AdminSurface className="p-3">
          <div className="mb-3 flex items-center gap-2 px-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground"><BellRing className="h-3.5 w-3.5 text-primary" /> Canales</div>
          <div className="space-y-1">
            {CHANNELS.map(({ value, label, icon: Icon }) => (
              <button key={value} type="button" onClick={() => setChannel(value)} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-xs font-semibold transition-colors ${channel === value ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'}`}>
                <Icon className="h-4 w-4" />{label}<span className="ml-auto rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px]">{templates.filter((template) => template.channel === value).length}</span>
              </button>
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-primary/15 bg-primary/[0.04] p-3 text-[11px] leading-5 text-muted-foreground"><Code2 className="mb-2 h-4 w-4 text-primary" />Los cambios solo afectan contenido. Credenciales y envíos siguen protegidos por Edge Functions y Vault.</div>
        </AdminSurface>

        <AdminSurface className="min-h-[520px] p-3">
          <div className="mb-3 flex items-center gap-2 px-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground"><Variable className="h-3.5 w-3.5 text-primary" /> Eventos · {channel}</div>
          <div className="space-y-1">
            {channelTemplates.map((template) => (
              <button key={template.id} type="button" onClick={() => setSelectedId(template.id)} className={`w-full rounded-xl border p-3 text-left transition-colors ${selected?.id === template.id ? 'border-primary/40 bg-primary/[0.07]' : 'border-transparent hover:border-white/[0.08] hover:bg-white/[0.03]'}`}>
                <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium text-foreground">{template.name}</span><span className={`h-2 w-2 shrink-0 rounded-full ${template.enabled ? 'bg-primary' : 'bg-muted-foreground/40'}`} /></div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground"><span>{template.event_key}</span><span>{template.locale}</span></div>
              </button>
            ))}
            {channelTemplates.length === 0 && <p className="p-5 text-center text-xs text-muted-foreground">No hay plantillas de este canal todavía. Puedes añadirlas cuando conectemos el siguiente proveedor.</p>}
          </div>
        </AdminSurface>

        <AdminSurface className="min-w-0 p-5 md:p-6">
          {selected ? <>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.08] pb-5"><div><div className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">{selected.event_key} · {selected.locale}</div><h2 className="mt-1 text-xl font-semibold tracking-tight">{selected.name}</h2></div><div className="flex items-center gap-2"><Label htmlFor="template-enabled" className="text-xs uppercase text-muted-foreground">Activo</Label><Switch id="template-enabled" checked={draft.enabled} onCheckedChange={(enabled) => setDraft((current) => ({ ...current, enabled }))} /></div></div>
            <div className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(300px,.8fr)]">
              <div className="space-y-4">
                <div className="space-y-2"><Label>Nombre interno</Label><Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></div>
                {channel === 'email' && <div className="space-y-2"><Label>Asunto <span className="text-muted-foreground">· click para insertar variables</span></Label><Input onFocus={() => setActiveField('subject')} value={draft.subject || ''} onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))} /></div>}
                <div className="flex flex-wrap gap-2 rounded-xl border border-white/[0.08] bg-black/15 p-3"><span className="mr-1 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground"><Variable className="h-3.5 w-3.5" /> Variables</span>{variableList.map((variable) => <button key={variable} type="button" onClick={() => appendVariable(variable)} className="rounded-md border border-primary/20 bg-primary/[0.06] px-2 py-1 text-[10px] font-mono text-primary hover:bg-primary/15">{`{{${variable}}}`}</button>)}</div>
                <div className="space-y-2"><Label>Mensaje de texto <span className="text-muted-foreground">· texto plano para WhatsApp, Telegram y fallback email</span></Label><Textarea onFocus={() => setActiveField('body_text')} value={draft.body_text} onChange={(event) => setDraft((current) => ({ ...current, body_text: event.target.value }))} className="min-h-52 font-mono text-xs leading-5" /></div>
                {channel === 'email' && <div className="space-y-2"><Label>HTML premium <span className="text-muted-foreground">· opcional, se usa sobre texto plano</span></Label><Textarea onFocus={() => setActiveField('body_html')} value={draft.body_html || ''} onChange={(event) => setDraft((current) => ({ ...current, body_html: event.target.value }))} className="min-h-64 font-mono text-xs leading-5" /></div>}
              </div>
              <div className="min-w-0"><div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground"><Eye className="h-3.5 w-3.5 text-primary" /> Vista previa</div><div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#09090f] p-3"><div className="mb-3 rounded-xl border border-white/[0.08] bg-[#11151d] px-4 py-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Asunto</p><p className="mt-1 text-sm text-foreground">{replacePreview(draft.subject || draft.name, draft)}</p></div><div className="max-h-[520px] overflow-auto rounded-xl bg-[#11151d] p-4 text-sm leading-6 text-muted-foreground">{channel === 'email' && draft.body_html ? <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(replacePreview(draft.body_html, draft), { USE_PROFILES: { html: true } }) }} /> : <pre className="whitespace-pre-wrap font-sans">{replacePreview(previewSource, draft)}</pre>}</div></div></div>
            </div>
          </> : <div className="flex min-h-[420px] items-center justify-center text-center text-sm text-muted-foreground">Selecciona una plantilla para editarla.</div>}
        </AdminSurface>
      </div>
    </div>
  );
}
