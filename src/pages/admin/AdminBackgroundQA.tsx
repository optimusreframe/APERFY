import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Loader2, ImageIcon, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type Preset =
  | 'system_workshop'
  | 'system_macro'
  | 'system_dark_premium'
  | 'custom'
  | 'premium_tech_plinth';

const PRESETS: { id: Preset; label: string; desc: string }[] = [
  { id: 'system_workshop', label: 'system_workshop', desc: 'Default · 3DtoPrint workshop' },
  { id: 'system_macro', label: 'system_macro', desc: 'Macro shallow DOF' },
  { id: 'system_dark_premium', label: 'system_dark_premium', desc: 'Dark cinematic premium' },
  { id: 'custom', label: 'custom', desc: 'Requires custom background URL' },
  { id: 'premium_tech_plinth', label: 'premium_tech_plinth', desc: 'Carbon-fiber tech plinth' },
];

interface Result {
  status: 'idle' | 'loading' | 'done' | 'error';
  image?: string;
  error?: string;
  ms?: number;
}

export default function AdminBackgroundQA() {
  const [sourceImage, setSourceImage] = useState('');
  const [customBackground, setCustomBackground] = useState('');
  const [results, setResults] = useState<Record<Preset, Result>>(() =>
    PRESETS.reduce((acc, p) => ({ ...acc, [p.id]: { status: 'idle' } }), {} as Record<Preset, Result>)
  );

  const runPreset = async (preset: Preset) => {
    setResults((r) => ({ ...r, [preset]: { status: 'loading' } }));
    const t0 = performance.now();
    try {
      const { data, error } = await supabase.functions.invoke('ai-product-import', {
        body: {
          action: 'generate_image',
          sourceImage,
          backgroundMode: preset,
          customBackground: preset === 'custom' ? customBackground : undefined,
        },
      });
      const ms = Math.round(performance.now() - t0);
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Unknown error');
      setResults((r) => ({
        ...r,
        [preset]: { status: 'done', image: data.data?.generated_image, ms },
      }));
    } catch (e: any) {
      setResults((r) => ({ ...r, [preset]: { status: 'error', error: e.message } }));
    }
  };

  const runAll = async () => {
    if (!sourceImage) {
      toast.error('Source image URL required');
      return;
    }
    if (!customBackground) {
      toast.warning('No custom background provided — "custom" preset will return an error (expected behavior).');
    }
    await Promise.all(PRESETS.map((p) => runPreset(p.id)));
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold">AI Background QA</h1>
        <p className="text-sm text-muted-foreground">
          Internal test of the 5 background presets against the same source image. Not exposed publicly.
        </p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Source Image URL (the 3D object)</Label>
            <Input
              placeholder="https://..."
              value={sourceImage}
              onChange={(e) => setSourceImage(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Custom Background URL (only used by `custom` preset)</Label>
            <Input
              placeholder="https://..."
              value={customBackground}
              onChange={(e) => setCustomBackground(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={runAll} disabled={!sourceImage}>
            Run all 5 presets
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {PRESETS.map((p) => {
          const r = results[p.id];
          return (
            <Card key={p.id} className="p-3 space-y-2 flex flex-col">
              <div>
                <div className="font-mono text-xs font-bold">{p.label}</div>
                <div className="text-[10px] text-muted-foreground">{p.desc}</div>
              </div>
              <div className="aspect-square w-full bg-muted rounded flex items-center justify-center overflow-hidden relative">
                {r.status === 'idle' && <ImageIcon className="w-8 h-8 text-muted-foreground" />}
                {r.status === 'loading' && <Loader2 className="w-8 h-8 animate-spin" />}
                {r.status === 'done' && r.image && (
                  <img src={r.image} alt={p.label} className="w-full h-full object-cover" />
                )}
                {r.status === 'error' && (
                  <div className="p-2 text-center text-xs text-destructive flex flex-col items-center gap-1">
                    <AlertTriangle className="w-6 h-6" />
                    <span className="break-words">{r.error}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{r.ms ? `${r.ms}ms` : '—'}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() => runPreset(p.id)}
                  disabled={!sourceImage || r.status === 'loading'}
                >
                  Re-run
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
