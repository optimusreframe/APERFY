import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Loader2, Sparkles, Image as ImageIcon, Link2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Product3DFieldProps {
  value: string;
  onChange: (v: string) => void;
  productName?: string;
  onImageGenerated?: (publicUrl: string) => void;
}

/**
 * Three modes for the 3D field:
 *  - url:    Manually paste a hosted .glb
 *  - tripo:  Generate a real .glb via Tripo3D (admin-toggled)
 *  - render: Generate a static AI render image via Lovable AI (admin-toggled)
 */
export default function Product3DField({ value, onChange, productName, onImageGenerated }: Product3DFieldProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<'url' | 'tripo' | 'render'>('url');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['ai3d-public-settings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('admin_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['ai_3d_tripo_enabled', 'ai_3d_render_enabled']);
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => { map[r.setting_key] = r.setting_value; });
      return {
        tripo: map['ai_3d_tripo_enabled'] === 'true',
        render: map['ai_3d_render_enabled'] === 'true',
      };
    },
    staleTime: 60_000,
  });

  const tripoEnabled = !!settings?.tripo;
  const renderEnabled = !!settings?.render;

  const handleGenerateTripo = async () => {
    const p = (prompt || productName || '').trim();
    if (p.length < 3) { toast({ title: 'Describe el modelo', description: 'Mínimo 3 caracteres.', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-generate-3d-tripo', { body: { prompt: p } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Generation failed');
      onChange(data.modelUrl);
      toast({ title: '✓', description: 'Modelo .glb generado y enlazado.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRender = async () => {
    const p = (prompt || productName || '').trim();
    if (p.length < 3) { toast({ title: 'Describe el modelo', description: 'Mínimo 3 caracteres.', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-render-3d-image', { body: { prompt: p } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Generation failed');

      // Upload base64 to product-images
      const bytes = Uint8Array.from(atob(data.imageBase64), (c) => c.charCodeAt(0));
      const path = `ai-renders/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
      const { error: upErr } = await supabase.storage.from('product-images').upload(path, bytes, { contentType: data.mimeType || 'image/png' });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('product-images').getPublicUrl(path);
      onImageGenerated?.(pub.publicUrl);
      toast({ title: '✓', description: 'Render generado y agregado a las imágenes del producto.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-background/30 p-3">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Box className="w-3.5 h-3.5" /> Modelo 3D / Render
        </Label>
        {value && (
          <button type="button" onClick={() => onChange('')} className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1">
            <X className="w-3 h-3" /> limpiar
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-secondary/50">
        <button type="button" onClick={() => setMode('url')}
          className={`px-2 py-1.5 rounded-md text-[11px] font-medium flex items-center justify-center gap-1 transition-colors ${mode === 'url' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
          <Link2 className="w-3 h-3" /> URL
        </button>
        <button type="button" onClick={() => setMode('tripo')} disabled={!tripoEnabled}
          className={`px-2 py-1.5 rounded-md text-[11px] font-medium flex items-center justify-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${mode === 'tripo' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'}`}>
          <Sparkles className="w-3 h-3" /> Tripo .glb
        </button>
        <button type="button" onClick={() => setMode('render')} disabled={!renderEnabled}
          className={`px-2 py-1.5 rounded-md text-[11px] font-medium flex items-center justify-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${mode === 'render' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'}`}>
          <ImageIcon className="w-3 h-3" /> Render
        </button>
      </div>

      {mode === 'url' && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…/model.glb"
          className="bg-secondary text-xs h-8"
        />
      )}

      {mode === 'tripo' && (
        <div className="space-y-2">
          {!tripoEnabled && <p className="text-[10px] text-muted-foreground">Activa Tripo3D en <strong>Admin → AI 3D</strong>.</p>}
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={productName ? `Describe el modelo (por defecto: "${productName}")` : 'Describe el modelo a generar…'}
            rows={2}
            className="bg-secondary text-xs"
            disabled={!tripoEnabled || loading}
          />
          <Button type="button" size="sm" onClick={handleGenerateTripo} disabled={!tripoEnabled || loading} className="w-full gap-2">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Generar .glb (~1–3 min)
          </Button>
          {value && <p className="text-[10px] text-muted-foreground truncate">✓ {value}</p>}
        </div>
      )}

      {mode === 'render' && (
        <div className="space-y-2">
          {!renderEnabled && <p className="text-[10px] text-muted-foreground">Activa Render AI en <strong>Admin → AI 3D</strong>.</p>}
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={productName ? `Descripción para el render (por defecto: "${productName}")` : 'Describe el producto…'}
            rows={2}
            className="bg-secondary text-xs"
            disabled={!renderEnabled || loading}
          />
          <Button type="button" size="sm" onClick={handleGenerateRender} disabled={!renderEnabled || loading} className="w-full gap-2">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
            Generar render (imagen)
          </Button>
          <p className="text-[10px] text-muted-foreground">El render se añade a las imágenes del producto.</p>
        </div>
      )}
    </div>
  );
}
