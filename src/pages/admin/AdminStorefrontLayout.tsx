import { useEffect, useState } from 'react';
import { Check, LayoutTemplate, Loader2, Moon, Save, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useStorefrontLayout } from '@/contexts/StorefrontLayoutContext';
import { STOREFRONT_DESIGNS, type StorefrontDesign } from '@/lib/storefront-layout';
import { AdminPageHeader, AdminSurface } from './_shared';

function LayoutPreview({ design }: { design: StorefrontDesign }) {
  return (
    <div className={`layout-preview layout-preview-${design}`} aria-hidden="true">
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
  const [draft, setDraft] = useState<StorefrontDesign>(config.design);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(config.design); }, [config.design]);

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const save = async () => {
    setSaving(true);
    try {
      await saveLayout({ design: draft });
      toast({ title: 'GUARDADO', description: 'El diseño público de la tienda fue actualizado.' });
    } catch (error) {
      toast({ title: 'ERROR', description: error instanceof Error ? error.message : 'No se pudo guardar el layout.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminPageHeader
        eyebrow="STOREFRONT · EXPERIENCIA PÚBLICA"
        title="LAYOUT DE TIENDA"
        meta="ELIGE LA COMPOSICIÓN PRINCIPAL DEL STOREFRONT"
        actions={<Button onClick={() => void save()} disabled={saving} className="gap-2 uppercase"><Save className="h-4 w-4" />{saving ? 'GUARDANDO' : 'GUARDAR DISEÑO'}</Button>}
      />

      <AdminSurface className="p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary"><LayoutTemplate className="h-5 w-5" /></div>
            <div><h2 className="font-semibold uppercase">DISEÑO PÚBLICO</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">El diseño cambia la composición visual de la tienda sin cambiar productos, inventario, carrito, precios ni contenido. Todos los presets conservan los colores de APERFY y funcionan con tema oscuro y claro.</p></div>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-black/15 px-3 py-2 text-xs text-muted-foreground"><Moon className="h-3.5 w-3.5" /><span>/</span><Sun className="h-3.5 w-3.5 text-primary" />Tema controlado por el selector público</div>
        </div>
      </AdminSurface>

      <div className="grid gap-5 md:grid-cols-2">
        {STOREFRONT_DESIGNS.map((option) => {
          const selected = draft === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setDraft(option.id)}
              aria-pressed={selected}
              className={`group text-left rounded-2xl border p-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${selected ? 'border-primary bg-primary/[0.08] shadow-[0_0_0_1px_hsl(var(--primary)/.18),0_24px_70px_hsl(var(--primary)/.12)]' : 'border-white/[0.08] bg-[hsl(220_17%_12%/.72)] hover:border-primary/40'}`}
            >
              <div className="relative">
                <LayoutPreview design={option.id} />
                {selected && <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"><Check className="h-4 w-4" /></span>}
              </div>
              <div className="px-2 pb-2 pt-4">
                <div className="flex items-baseline justify-between gap-3"><h3 className="font-display text-lg font-bold">{option.name}</h3><span className="text-[10px] font-mono uppercase tracking-[.16em] text-primary">{option.reference}</span></div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{option.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2">{option.traits.map((trait) => <span key={trait} className="rounded-full border border-border/70 bg-background/40 px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">{trait}</span>)}</div>
              </div>
            </button>
          );
        })}
      </div>

      <AdminSurface className="p-5 md:p-6"><p className="text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">Nota:</span> el tema claro u oscuro se mantiene como preferencia del visitante desde el icono de tema del encabezado. Así cada diseño se puede revisar en ambos modos sin forzar una preferencia global al cliente.</p></AdminSurface>
    </div>
  );
}
