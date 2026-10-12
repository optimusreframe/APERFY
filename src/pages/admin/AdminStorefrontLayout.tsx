import { useEffect, useState } from 'react';
import { Check, Grid2X2, LayoutGrid, LayoutTemplate, Loader2, Monitor, Moon, Rows3, Save, Smartphone, Sun, Tablet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useStorefrontLayout } from '@/contexts/StorefrontLayoutContext';
import { STOREFRONT_DESIGNS, STOREFRONT_DEVICES, type StorefrontDesign, type StorefrontDevice, type StorefrontLayoutConfig } from '@/lib/storefront-layout';
import { AdminPageHeader, AdminSurface } from './_shared';

function LayoutPreview({ design, compact = false }: { design: StorefrontDesign; compact?: boolean }) {
  const previewClass = `layout-preview${compact ? ' layout-preview-compact' : ''}`;
  if (design === 'design2') {
    return <div className={`${previewClass} layout-preview-design2`} aria-hidden="true"><div className="layout-preview-top"><span /><span /><span /><i /></div><div className="layout-preview-tech-hero"><small>APERFY · TECH ACCESSORIES</small><strong>Technology that moves with you.</strong><em /><b>Shop now →</b><div className="layout-preview-device" /></div><div className="layout-preview-tech-rail"><span /><span /><span /><span /></div><div className="layout-preview-nav"><span /><span /><span /><span /><span /></div></div>;
  }
  if (design === 'design3') {
    return <div className={`${previewClass} layout-preview-design3`} aria-hidden="true"><div className="layout-preview-top"><span /><span /><span /><i /></div><div className="layout-preview-luxury-hero"><div><small>APERFY · PRIVATE SELECTION</small><strong>Find something that feels like yours.</strong><em /><b>View collection →</b></div><div className="layout-preview-luxury-image" /></div><div className="layout-preview-luxury-card"><i /><span /><b /></div><div className="layout-preview-nav"><span /><span /><span /><span /><span /></div></div>;
  }
  if (design === 'design4') {
    return <div className={`${previewClass} layout-preview-design4`} aria-hidden="true"><div className="layout-preview-top"><span /><span /><span /><i /></div><div className="layout-preview-drops-top"><strong>APER<span>FY</span></strong><small>DROPS</small><i>Shipping across USA</i></div><div className="layout-preview-drops-search" /><div className="layout-preview-drops-banner"><strong>New arrivals</strong><span>The next drop lands here first.</span></div><div className="layout-preview-drops-grid"><span /><span /><span /><span /></div><div className="layout-preview-nav"><span /><span /><span /><span /><span /></div></div>;
  }
  return (
    <div className={`${previewClass} layout-preview-${design}`} aria-hidden="true">
      <div className="layout-preview-top"><span /><span /><span /><i /></div>
      <div className="layout-preview-body">
        <div className="layout-preview-copy"><small>APERFY</small><strong>{design === 'design4' ? 'Drops & novedades' : design === 'design3' ? 'Tu selección' : design === 'design2' ? 'Tech. Sin límites.' : 'Ofertas disponibles'}</strong><em /></div>
        <div className="layout-preview-search" />
        <div className="layout-preview-cards"><span /><span /><span /></div>
      </div>
      <div className="layout-preview-nav"><span /><span /><span /><span /><span /></div>
    </div>
  );
}

export default function AdminStorefrontLayout() {
  const { config, isLoading, saveLayout } = useStorefrontLayout();
  const { toast } = useToast();
  const [draft, setDraft] = useState<StorefrontLayoutConfig>(config);
  const [activeDevice, setActiveDevice] = useState<StorefrontDevice>('mobile');
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'single' | 'list'>('grid');

  useEffect(() => { setDraft(config); }, [config]);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(config);

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const save = async () => {
    setSaving(true);
    try {
      await saveLayout(draft);
      toast({ title: 'GUARDADO', description: 'Los diseños por dispositivo fueron actualizados.' });
    } catch (error) {
      toast({ title: 'ERROR', description: error instanceof Error ? error.message : 'No se pudo guardar el layout.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-20">
      <AdminPageHeader
        eyebrow="STOREFRONT · EXPERIENCIA PÚBLICA"
        title="LAYOUT DE TIENDA"
        meta="ELIGE UN DISEÑO PARA CADA TIPO DE PANTALLA"
        actions={<Button onClick={() => void save()} disabled={saving} className="gap-2 uppercase"><Save className="h-4 w-4" />{saving ? 'GUARDANDO' : 'GUARDAR DISEÑO'}</Button>}
      />

      <div className="sticky top-2 z-20 -mx-1 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/80 bg-background/95 p-2 shadow-lg backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto scrollbar-hide" role="group" aria-label="Dispositivo de previsualización">
          {STOREFRONT_DEVICES.map((device) => {
            const Icon = device.id === 'mobile' ? Smartphone : device.id === 'tablet' ? Tablet : Monitor;
            const selected = activeDevice === device.id;
            return <Button key={device.id} type="button" size="sm" variant={selected ? 'default' : 'ghost'} onClick={() => setActiveDevice(device.id)} className="shrink-0 gap-1.5 text-xs"><Icon className="h-3.5 w-3.5" />{device.label}</Button>;
          })}
        </div>
        <Button type="button" size="sm" onClick={() => void save()} disabled={!isDirty || saving} className="shrink-0 gap-1.5 uppercase shadow-md"><Save className="h-3.5 w-3.5" />{saving ? 'GUARDANDO' : 'GUARDAR'}</Button>
      </div>

      <AdminSurface className="p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary"><LayoutTemplate className="h-5 w-5" /></div>
            <div><h2 className="font-semibold uppercase">DISEÑO PÚBLICO</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">Asigna una composición independiente para móvil, iPad y desktop. El storefront cambia automáticamente según el ancho de pantalla; los productos, inventario, carrito, precios y contenido permanecen intactos.</p></div>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground"><Moon className="h-3.5 w-3.5" /><span>/</span><Sun className="h-3.5 w-3.5 text-primary" />Tema controlado por el selector público</div>
        </div>
      </AdminSurface>

      <AdminSurface className="p-5 md:p-6">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="font-semibold uppercase">DISEÑO POR DISPOSITIVO</h2>
          <p className="text-sm text-muted-foreground">Selecciona un dispositivo y luego elige uno de los cuatro diseños para ese breakpoint.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {STOREFRONT_DEVICES.map((device) => {
            const Icon = device.id === 'mobile' ? Smartphone : device.id === 'tablet' ? Tablet : Monitor;
            const selected = activeDevice === device.id;
            const selectedDesign = STOREFRONT_DESIGNS.find((option) => option.id === draft[device.id]);
            return (
              <button
                key={device.id}
                type="button"
                onClick={() => setActiveDevice(device.id)}
                aria-pressed={selected}
                className={`rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${selected ? 'border-primary bg-primary/[0.08] shadow-[0_0_0_1px_hsl(var(--primary)/.18)]' : 'border-white/[0.08] bg-background/30 hover:border-primary/40'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${selected ? 'border-primary/30 bg-primary/15 text-primary' : 'border-border bg-card text-muted-foreground'}`}><Icon className="h-5 w-5" /></span>
                  {selected && <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">Editando</span>}
                </div>
                <p className="mt-4 font-semibold uppercase">{device.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{device.description}</p>
                <p className="mt-3 text-sm text-primary">{selectedDesign?.name ?? 'Diseño 1'}</p>
              </button>
            );
          })}
        </div>
      </AdminSurface>

      <div className="flex flex-wrap items-center justify-between gap-3 px-1"><div className="flex min-w-0 items-center gap-3 text-xs uppercase tracking-[.16em] text-muted-foreground"><span className="hidden h-px w-8 bg-border/70 sm:block" /><span>Diseños para {STOREFRONT_DEVICES.find((device) => device.id === activeDevice)?.label}</span><span className="h-px w-8 bg-border/70 sm:block" /></div><div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1" role="group" aria-label="Vista de diseños"><Button type="button" size="icon" variant={viewMode === 'grid' ? 'secondary' : 'ghost'} className="h-8 w-8" aria-label="Vista en grid" onClick={() => setViewMode('grid')}><Grid2X2 className="h-4 w-4" /></Button><Button type="button" size="icon" variant={viewMode === 'single' ? 'secondary' : 'ghost'} className="h-8 w-8" aria-label="Vista individual" onClick={() => setViewMode('single')}><LayoutGrid className="h-4 w-4" /></Button><Button type="button" size="icon" variant={viewMode === 'list' ? 'secondary' : 'ghost'} className="h-8 w-8" aria-label="Vista en lista" onClick={() => setViewMode('list')}><Rows3 className="h-4 w-4" /></Button></div></div>

      <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3 sm:gap-4' : viewMode === 'single' ? 'mx-auto grid max-w-3xl gap-4' : 'grid gap-3'}>
        {STOREFRONT_DESIGNS.map((option) => {
          const selected = draft[activeDevice] === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setDraft((current) => ({ ...current, [activeDevice]: option.id }))}
              aria-pressed={selected}
                className={`group text-left rounded-2xl border p-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${viewMode === 'list' ? 'layout-design-option-list flex items-center gap-3 sm:gap-4' : ''} ${selected ? 'border-primary bg-primary/[0.08] shadow-[0_0_0_1px_hsl(var(--primary)/.18),0_24px_70px_hsl(var(--primary)/.12)]' : 'border-border bg-card hover:border-primary/40'}`}
            >
              <div className={`relative ${viewMode === 'list' ? 'w-28 shrink-0 sm:w-40' : ''}`}>
                <LayoutPreview design={option.id} compact={viewMode === 'list'} />
                {selected && <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"><Check className="h-4 w-4" /></span>}
              </div>
              <div className={viewMode === 'list' ? 'min-w-0 flex-1 py-1 pr-2' : 'px-2 pb-2 pt-4'}>
                <div className="flex items-baseline justify-between gap-3"><h3 className="font-display text-lg font-bold">{option.name}</h3><span className="text-[10px] font-mono uppercase tracking-[.16em] text-primary">{option.reference}</span></div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{option.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2">{option.traits.map((trait) => <span key={trait} className="rounded-full border border-border/70 bg-background/40 px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">{trait}</span>)}</div>
              </div>
            </button>
          );
        })}
      </div>

      <AdminSurface className="p-5 md:p-6"><p className="text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">Nota:</span> el tema claro u oscuro se mantiene como preferencia del visitante desde el icono de tema del encabezado. Así cada diseño se puede revisar en ambos modos sin forzar una preferencia global al cliente.</p></AdminSurface>
      <div className="sticky bottom-4 z-20 flex justify-end pointer-events-none"><Button type="button" onClick={() => void save()} disabled={!isDirty || saving} className="pointer-events-auto gap-2 rounded-full px-5 uppercase shadow-[0_14px_40px_hsl(var(--primary)/.25)]"><Save className="h-4 w-4" />{saving ? 'GUARDANDO' : 'GUARDAR CAMBIOS'}</Button></div>
    </div>
  );
}
