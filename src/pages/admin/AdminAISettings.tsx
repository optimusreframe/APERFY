import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Eye, KeyRound, Loader2, Plus, Save, Search, Sparkles, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { AdminPageHeader, AdminSurface } from './_shared';
import { AI_PROVIDERS, type AiCapability, type AiProviderDefinition, getAiProvider } from '@/lib/ai-providers';

const KEYS = ['ai_provider', 'ai_model', 'ai_image_provider', 'ai_image_model', 'ai_provider_assignments', 'ai_custom_providers', 'ai_search_enabled', 'ai_discount_percent'] as const;
type RoleKey = 'text' | 'vision' | 'image' | 'video';
type Assignment = { provider: string; model: string; baseUrl?: string };
type CustomProvider = Pick<AiProviderDefinition, 'id' | 'label' | 'description' | 'defaultBaseUrl' | 'modelPlaceholder'>;

const ROLE_META: Record<RoleKey, { title: string; description: string; secret: 'text' | 'image' | 'video' }> = {
  text: { title: 'Texto y herramientas', description: 'Extracción, traducción, copy y acciones con funciones estructuradas.', secret: 'text' },
  vision: { title: 'Visión y análisis de fotos', description: 'Identificación de productos y lectura de imágenes cargadas al catálogo.', secret: 'image' },
  image: { title: 'Generación de imágenes', description: 'Fondos, ángulos y composiciones para fotografías de producto.', secret: 'image' },
  video: { title: 'Video', description: 'Proveedor independiente para futuras acciones de video generativo.', secret: 'video' },
};

const ROLE_CAPABILITY: Record<RoleKey, AiCapability | null> = {
  text: 'text',
  vision: 'vision',
  image: 'image-generation',
  // APERFY has no video-generation action yet, so no provider can be assigned here.
  video: null,
};

const emptyAssignments = (): Record<RoleKey, Assignment> => ({
  text: { provider: '', model: '' },
  vision: { provider: '', model: '' },
  image: { provider: '', model: '' },
  video: { provider: '', model: '' },
});

function providerOptions(customProviders: CustomProvider[]) {
  return [...AI_PROVIDERS, ...customProviders.map((item) => ({
    ...getAiProvider('openai-compatible'),
    ...item,
    protocol: 'openai-compatible' as const,
    docsUrl: '',
    keyUrl: '',
    modelExamples: [],
    capabilities: ['text', 'tools', 'vision', 'image-generation'] as AiProviderDefinition['capabilities'],
    tutorial: [{ title: 'Proveedor personalizado', body: 'Usa la documentación de tu proveedor para confirmar el endpoint y el modelo.' }],
  }))];
}

function SetupAssistant({ definition, role }: { definition: AiProviderDefinition; role: RoleKey }) {
  return <div className="mt-4 rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><p className="text-[10px] font-mono uppercase tracking-[0.18em] text-primary">ASISTENTE · {ROLE_META[role].title}</p><p className="mt-1 text-sm text-muted-foreground">{definition.description}</p></div>
      <div className="flex flex-wrap gap-1.5">{definition.capabilities.map((capability) => <span key={capability} className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase text-muted-foreground">{capability.replace('-', ' ')}</span>)}</div>
    </div>
    <ol className="mt-4 grid gap-3 md:grid-cols-3">
      {definition.tutorial.map((step, index) => <li key={step.title} className="rounded-lg border border-white/[0.08] bg-black/15 p-3"><span className="font-mono text-xs text-primary">0{index + 1}</span><p className="mt-1 text-sm font-medium">{step.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{step.body}</p></li>)}
    </ol>
    <div className="mt-4 flex flex-wrap gap-3 text-xs">
      {definition.keyUrl && <a href={definition.keyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Obtener API key <ExternalLink className="h-3 w-3" /></a>}
      {definition.docsUrl && <a href={definition.docsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Abrir documentación <ExternalLink className="h-3 w-3" /></a>}
      <span className="text-muted-foreground">Base URL sugerido: <code className="text-foreground/80">{definition.defaultBaseUrl}</code></span>
    </div>
  </div>;
}

export function AiProviderSetup({ embedded = false }: { embedded?: boolean } = {}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [assignments, setAssignments] = useState<Record<RoleKey, Assignment>>(emptyAssignments);
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([]);
  const [expandedRole, setExpandedRole] = useState<RoleKey | null>('text');
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [discount, setDiscount] = useState('20');
  const [newProvider, setNewProvider] = useState({ id: '', label: '', baseUrl: '', model: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-ai-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('admin_settings').select('setting_key, setting_value').in('setting_key', [...KEYS]);
      if (error) throw error;
      return data;
    },
  });

  const { data: integrationStatuses = [] } = useQuery({
    queryKey: ['admin-ai-integration-status'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-integrations', { body: { action: 'status' } });
      if (error) throw error;
      return (data?.statuses ?? []) as Array<{ name: string; configured: boolean }>;
    },
  });

  useEffect(() => {
    const next = emptyAssignments();
    const assignmentRow = data?.find((row) => row.setting_key === 'ai_provider_assignments')?.setting_value;
    if (assignmentRow) {
      try {
        const parsed = JSON.parse(assignmentRow) as Partial<Record<RoleKey, Assignment>>;
        for (const role of Object.keys(next) as RoleKey[]) if (parsed[role]?.provider) next[role] = { ...next[role], ...parsed[role] };
      } catch { /* fall back to legacy settings below */ }
    }
    const legacyProvider = data?.find((row) => row.setting_key === 'ai_provider')?.setting_value;
    const legacyModel = data?.find((row) => row.setting_key === 'ai_model')?.setting_value;
    const legacyImageProvider = data?.find((row) => row.setting_key === 'ai_image_provider')?.setting_value;
    const legacyImageModel = data?.find((row) => row.setting_key === 'ai_image_model')?.setting_value;
    if (!assignmentRow && legacyProvider) next.text = { provider: legacyProvider, model: legacyModel || 'gpt-4o-mini' };
    if (!assignmentRow && legacyImageProvider) {
      next.vision = { provider: legacyImageProvider, model: legacyImageModel || '' };
      next.image = { provider: legacyImageProvider, model: legacyImageModel || '' };
    }
    setAssignments(next);
    const customRow = data?.find((row) => row.setting_key === 'ai_custom_providers')?.setting_value;
    if (customRow) {
      try { setCustomProviders(JSON.parse(customRow) as CustomProvider[]); } catch { setCustomProviders([]); }
    }
    setSearchEnabled(data?.find((row) => row.setting_key === 'ai_search_enabled')?.setting_value === 'true');
    setDiscount(data?.find((row) => row.setting_key === 'ai_discount_percent')?.setting_value || '20');
  }, [data]);

  const options = useMemo(() => providerOptions(customProviders), [customProviders]);
  const keyStatus = integrationStatuses.some((status) => status.name === 'AI_PROVIDER_API_KEY' && status.configured);
  const imageKeyStatus = integrationStatuses.some((status) => status.name === 'AI_IMAGE_PROVIDER_API_KEY' && status.configured);
  const videoKeyStatus = integrationStatuses.some((status) => status.name === 'AI_VIDEO_PROVIDER_API_KEY' && status.configured);

  const updateRole = (role: RoleKey, patch: Partial<Assignment>) => setAssignments((current) => ({ ...current, [role]: { ...current[role], ...patch } }));
  const selectProvider = (role: RoleKey, provider: string) => {
    const definition = options.find((item) => item.id === provider) || getAiProvider(provider);
    const capability = ROLE_CAPABILITY[role];
    if (!capability) {
      toast({ title: 'FUNCIÓN NO DISPONIBLE', description: 'APERFY todavía no tiene una acción de generación de video conectada.', variant: 'destructive' });
      return;
    }
    if (!definition.capabilities.includes(capability)) {
      toast({ title: 'CAPACIDAD NO COMPATIBLE', description: `${definition.label} no declara soporte para ${ROLE_META[role].title.toLowerCase()}.`, variant: 'destructive' });
      return;
    }
    updateRole(role, { provider, model: role === 'image' ? (definition.imageModelPlaceholder || definition.modelPlaceholder) : definition.modelPlaceholder, baseUrl: definition.defaultBaseUrl });
  };

  const addCustomProvider = () => {
    const id = newProvider.id.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (!id || !newProvider.label.trim() || !newProvider.baseUrl.trim() || !newProvider.model.trim()) {
      toast({ title: 'FALTAN DATOS', description: 'Completa identificador, nombre, base URL y modelo del proveedor.', variant: 'destructive' });
      return;
    }
    if (options.some((item) => item.id === id)) { toast({ title: 'ID EN USO', description: 'Usa otro identificador para el proveedor.', variant: 'destructive' }); return; }
    setCustomProviders((current) => [...current, { id, label: newProvider.label.trim(), description: 'Proveedor personalizado compatible con OpenAI.', defaultBaseUrl: newProvider.baseUrl.trim().replace(/\/$/, ''), modelPlaceholder: newProvider.model.trim() }]);
    setNewProvider({ id: '', label: '', baseUrl: '', model: '' });
    toast({ title: 'PROVEEDOR AÑADIDO', description: 'Ahora puedes asignarlo a una o más funciones.' });
  };

  const removeCustomProvider = (id: string) => {
    setCustomProviders((current) => current.filter((provider) => provider.id !== id));
    setAssignments((current) => Object.fromEntries(Object.entries(current).map(([role, assignment]) => [role, assignment.provider === id ? { provider: '', model: '' } : assignment])) as Record<RoleKey, Assignment>);
  };

  const save = useMutation({
    mutationFn: async () => {
      const activeAssignments = Object.fromEntries(Object.entries(assignments).filter(([, value]) => value.provider && value.model));
      if (!Object.keys(activeAssignments).length) throw new Error('Asigna al menos un proveedor a una función antes de guardar.');
      const summary = Object.entries(activeAssignments).map(([role, value]) => `${ROLE_META[role as RoleKey].title}: ${(value as Assignment).provider}`).join('\n');
      if (!window.confirm(`¿Guardar estas asignaciones de IA?\n\n${summary}`)) throw new Error('SAVE_CANCELLED');
      const text = assignments.text;
      const image = assignments.image.provider ? assignments.image : assignments.vision;
      const values = {
        ai_provider: text.provider,
        ai_model: text.model,
        ai_image_provider: image.provider,
        ai_image_model: image.model,
        ai_provider_assignments: JSON.stringify(activeAssignments),
        ai_custom_providers: JSON.stringify(customProviders),
        ai_search_enabled: String(searchEnabled),
        ai_discount_percent: String(Math.min(90, Math.max(0, Number(discount) || 20))),
      };
      for (const [setting_key, setting_value] of Object.entries(values)) {
        const { error } = await supabase.from('admin_settings').upsert({ setting_key, setting_value }, { onConflict: 'setting_key' });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-ai-settings'] }); qc.invalidateQueries({ queryKey: ['admin-ai-integration-provider'] }); toast({ title: 'GUARDADO', description: 'Proveedores, funciones y modelos actualizados.' }); },
    onError: (error: unknown) => { if (error instanceof Error && error.message === 'SAVE_CANCELLED') return; toast({ title: 'ERROR', description: error instanceof Error ? error.message : 'No se pudo guardar la configuración.', variant: 'destructive' }); },
  });

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const assignedCount = Object.values(assignments).filter((assignment) => assignment.provider && assignment.model).length;

  return <div className={embedded ? 'space-y-5' : 'mx-auto max-w-5xl space-y-6'}>
    {embedded ? <div className="flex flex-col gap-3 border-b border-white/[0.08] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">CONFIGURACIÓN CENTRALIZADA</p><h2 className="mt-1 text-xl font-semibold uppercase">PROVEEDORES DE IA</h2><p className="mt-1 text-sm text-muted-foreground">Aquí eliges el proveedor y el modelo para cada función. Las credenciales se guardan en la sección Vault de esta misma pantalla.</p></div>
      <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2 uppercase">{save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} GUARDAR PROVEEDORES</Button>
    </div> : <AdminPageHeader eyebrow="SYSTEM · AI PRODUCT INTELLIGENCE" title="AI SETTINGS" meta="CONFIGURA PROVEEDORES NATIVOS Y ASÍGNALOS POR FUNCIÓN" actions={<Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2 uppercase">{save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} GUARDAR</Button>} />}
    <AdminSurface className="p-5 md:p-6"><div className="flex items-start gap-3 border-b border-white/[0.08] pb-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary"><Sparkles className="h-5 w-5" /></div><div><h2 className="font-semibold uppercase">ASISTENTE DE PROVEEDORES</h2><p className="mt-1 text-sm text-muted-foreground">Configura cada función por separado. Puedes repetir un proveedor en varias funciones o combinar proveedores distintos; nada se guarda hasta pulsar guardar.</p></div></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-3 text-xs"><span className="text-muted-foreground">{assignedCount} función{assignedCount === 1 ? '' : 'es'} configurada{assignedCount === 1 ? '' : 's'}</span><span className="font-medium text-primary">Elige proveedor + modelo en cada fila</span></div>
      <div className="mt-5 space-y-3">{(Object.keys(ROLE_META) as RoleKey[]).map((role) => {
        const assignment = assignments[role];
        const definition = options.find((item) => item.id === assignment.provider) || getAiProvider(assignment.provider);
        const capability = ROLE_CAPABILITY[role];
        const availableOptions = options.filter((provider) => capability ? provider.capabilities.includes(capability) : false);
        const assigned = Boolean(assignment.provider && assignment.model);
        const credentialReady = ROLE_META[role].secret === 'text' ? keyStatus : ROLE_META[role].secret === 'video' ? videoKeyStatus : imageKeyStatus;
        return <div key={role} className={`rounded-xl border p-4 transition ${assigned ? 'border-primary/30 bg-primary/[0.035]' : 'border-white/[0.08] bg-black/10'}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{ROLE_META[role].title}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-mono uppercase ${assigned ? 'bg-primary/15 text-primary' : capability ? 'bg-white/10 text-muted-foreground' : 'bg-white/5 text-muted-foreground/70'}`}>{assigned ? definition.label : capability ? 'SIN ASIGNAR' : 'PRÓXIMAMENTE'}</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{ROLE_META[role].description}</p></div><span className={`inline-flex w-fit items-center gap-1.5 text-[10px] font-mono uppercase ${credentialReady ? 'text-primary' : 'text-muted-foreground'}`}><KeyRound className="h-3 w-3" />{credentialReady ? 'CREDENCIAL LISTA' : capability ? 'CREDENCIAL PENDIENTE' : 'SIN ACCIÓN CONECTADA'}</span></div>
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><div className="space-y-2"><Label className="text-[11px] uppercase tracking-wider">Proveedor</Label><select aria-label={`Proveedor para ${ROLE_META[role].title}`} value={assignment.provider} onChange={(event) => selectProvider(role, event.target.value)} disabled={!capability} className="flex h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"><option value="">{capability ? 'Seleccionar proveedor compatible' : 'Video aún no disponible'}</option>{availableOptions.map((provider) => <option key={provider.id} value={provider.id}>{provider.label}</option>)}</select><p className="text-xs text-muted-foreground">{capability ? `${availableOptions.length} proveedor${availableOptions.length === 1 ? '' : 'es'} compatible${availableOptions.length === 1 ? '' : 's'}.` : 'APERFY todavía no tiene una acción de video generativo conectada.'}</p></div><div className="space-y-2"><Label className="text-[11px] uppercase tracking-wider">Model ID</Label><Input aria-label={`Modelo para ${ROLE_META[role].title}`} value={assignment.model} onChange={(event) => updateRole(role, { model: event.target.value })} disabled={!capability} className="border-white/10 bg-black/20 disabled:cursor-not-allowed disabled:opacity-60" placeholder={role === 'image' ? (definition.imageModelPlaceholder || definition.modelPlaceholder) : definition.modelPlaceholder} /></div></div>
          {assigned && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] pt-3"><span className="text-[11px] text-muted-foreground">La guía corresponde a <span className="font-medium text-foreground">{definition.label}</span> para esta función.</span><button type="button" onClick={() => setExpandedRole((current) => current === role ? null : role)} className="text-[10px] font-mono uppercase tracking-wider text-primary hover:underline">{expandedRole === role ? 'Ocultar guía' : 'Ver guía'}</button></div>}
          {assigned && expandedRole === role && <SetupAssistant definition={definition} role={role} />}
        </div>;
      })}</div>
      <div className="mt-4 grid gap-2 text-[10px] font-mono uppercase sm:grid-cols-3"><span className={`rounded-full px-2 py-2 ${keyStatus ? 'bg-primary/15 text-primary' : 'bg-white/10 text-muted-foreground'}`}><span>{keyStatus ? 'READY' : 'NOT SET'}</span> · TEXTO</span><span className={`rounded-full px-2 py-2 ${imageKeyStatus ? 'bg-primary/15 text-primary' : 'bg-white/10 text-muted-foreground'}`}><span>{imageKeyStatus ? 'READY' : 'NOT SET'}</span> · VISIÓN / IMAGEN</span><span className={`rounded-full px-2 py-2 ${videoKeyStatus ? 'bg-primary/15 text-primary' : 'bg-white/10 text-muted-foreground'}`}><span>{videoKeyStatus ? 'READY' : 'NOT SET'}</span> · VIDEO</span></div>
    </AdminSurface>
    <AdminSurface className="p-5 md:p-6"><div className="flex items-start gap-3 border-b border-white/[0.08] pb-5"><Plus className="h-5 w-5 text-primary" /><div><h2 className="font-semibold uppercase">AGREGAR PROVEEDOR</h2><p className="mt-1 text-sm text-muted-foreground">Añade cualquier gateway compatible con OpenAI sin modificar el código.</p></div></div><div className="mt-5 grid gap-3 md:grid-cols-4"><Input value={newProvider.id} onChange={(event) => setNewProvider((current) => ({ ...current, id: event.target.value }))} placeholder="id-interno" className="border-white/10 bg-black/20" /><Input value={newProvider.label} onChange={(event) => setNewProvider((current) => ({ ...current, label: event.target.value }))} placeholder="Nombre visible" className="border-white/10 bg-black/20" /><Input value={newProvider.baseUrl} onChange={(event) => setNewProvider((current) => ({ ...current, baseUrl: event.target.value }))} placeholder="https://gateway/v1" className="border-white/10 bg-black/20" /><Input value={newProvider.model} onChange={(event) => setNewProvider((current) => ({ ...current, model: event.target.value }))} placeholder="modelo recomendado" className="border-white/10 bg-black/20" /></div><Button type="button" variant="outline" onClick={addCustomProvider} className="mt-4 gap-2"><Plus className="h-4 w-4" /> AÑADIR A LA LISTA</Button>{customProviders.length > 0 && <div className="mt-4 space-y-2">{customProviders.map((provider) => <div key={provider.id} className="flex items-center justify-between rounded-lg border border-white/[0.08] px-3 py-2"><span className="text-sm">{provider.label} <code className="ml-2 text-xs text-muted-foreground">{provider.defaultBaseUrl}</code></span><button type="button" onClick={() => removeCustomProvider(provider.id)} className="text-muted-foreground hover:text-destructive" aria-label={`Eliminar ${provider.label}`}><Trash2 className="h-4 w-4" /></button></div>)}</div>}</AdminSurface>
    <AdminSurface className="p-5 md:p-6"><div className="flex items-start gap-3"><Search className="mt-1 h-4 w-4 text-primary" /><div><h2 className="font-semibold uppercase">MARKET REFERENCE</h2><p className="mt-1 text-sm text-muted-foreground">Analiza fotos, identifica el producto y calcula una recomendación basada en el precio de mercado.</p></div></div><div className="mt-5 grid gap-4 md:grid-cols-[1fr_180px] md:items-end"><div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-black/20 p-4"><div><p className="text-sm font-medium uppercase">BUSCAR REFERENCIAS</p><p className="mt-1 text-xs text-muted-foreground">ACTIVA LA BÚSQUEDA CUANDO EL API ESTÉ CONFIGURADO.</p></div><Switch checked={searchEnabled} onCheckedChange={setSearchEnabled} /></div><div className="space-y-2"><Label className="uppercase tracking-wider">DESCUENTO SUGERIDO (%)</Label><Input type="number" min="0" max="90" value={discount} onChange={e => setDiscount(e.target.value)} className="border-white/10 bg-black/20 font-mono text-primary" /></div></div></AdminSurface>
    <div className="flex items-center gap-2 text-xs text-muted-foreground"><Eye className="h-3.5 w-3.5" /> Las claves nunca se muestran ni se guardan en el navegador. Cada función puede usar un proveedor distinto.</div>
  </div>;
}

// Kept as a compatibility entry point for bookmarks and existing integrations.
// The admin route redirects to Integrations, where this setup is now embedded.
export default function AdminAISettings() {
  return <AiProviderSetup />;
}
