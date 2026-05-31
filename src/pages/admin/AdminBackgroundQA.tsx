import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ImageIcon, AlertTriangle, Upload, Trash2, CheckCircle2 } from 'lucide-react';
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
  usedReference?: boolean;
}

export default function AdminBackgroundQA() {
  const [sourceImage, setSourceImage] = useState('');
  const [customBackground, setCustomBackground] = useState('');
  const [results, setResults] = useState<Record<Preset, Result>>(() =>
    PRESETS.reduce((acc, p) => ({ ...acc, [p.id]: { status: 'idle' } }), {} as Record<Preset, Result>)
  );

  // ── Official system_background management ──
  const [officialBg, setOfficialBg] = useState<string | null>(null);
  const [loadingBg, setLoadingBg] = useState(true);
  const [uploadingBg, setUploadingBg] = useState(false);

  const fetchOfficialBg = async () => {
    setLoadingBg(true);
    const { data } = await supabase
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'system_background')
      .maybeSingle();
    setOfficialBg(data?.setting_value || null);
    setLoadingBg(false);
  };

  useEffect(() => {
    fetchOfficialBg();
  }, []);

  const handleUploadBg = async (file: File) => {
    setUploadingBg(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `system-settings/system_background_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('product-images')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('product-images').getPublicUrl(path);
      const url = pub.publicUrl;

      // Upsert into admin_settings without disturbing other keys
      const { data: existing } = await supabase
        .from('admin_settings')
        .select('id')
        .eq('setting_key', 'system_background')
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from('admin_settings')
          .update({ setting_value: url, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('admin_settings')
          .insert({ setting_key: 'system_background', setting_value: url });
        if (error) throw error;
      }
      toast.success('Official background updated');
      setOfficialBg(url);
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploadingBg(false);
    }
  };

  const handleRemoveBg = async () => {
    if (!confirm('Remove the official workshop background?')) return;
    try {
      const { data: existing } = await supabase
        .from('admin_settings')
        .select('id, setting_value')
        .eq('setting_key', 'system_background')
        .maybeSingle();
      if (!existing) {
        setOfficialBg(null);
        return;
      }
      // Clear the value (don't delete the row to preserve any external references)
      const { error } = await supabase
        .from('admin_settings')
        .update({ setting_value: null, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) throw error;
      setOfficialBg(null);
      toast.success('Official background removed');
    } catch (e: any) {
      toast.error(e.message || 'Remove failed');
    }
  };

  const runPreset = async (preset: Preset) => {
    const willUseReference = preset === 'system_workshop' && !!officialBg;
    setResults((r) => ({ ...r, [preset]: { status: 'loading', usedReference: willUseReference } }));
    const t0 = performance.now();
    try {
      const { data, error } = await supabase.functions.invoke('ai-product-import', {
        body: {
          action: 'generate_image',
          sourceImage,
          backgroundMode: preset,
          customBackground:
            preset === 'custom'
              ? customBackground
              : preset === 'system_workshop' && officialBg
                ? officialBg
                : undefined,
        },
      });
      const ms = Math.round(performance.now() - t0);
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Unknown error');
      setResults((r) => ({
        ...r,
        [preset]: {
          status: 'done',
          image: data.data?.generated_image,
          ms,
          usedReference: willUseReference,
        },
      }));
    } catch (e: any) {
      setResults((r) => ({
        ...r,
        [preset]: { status: 'error', error: e.message, usedReference: willUseReference },
      }));
    }
  };

  const runAll = async () => {
    if (!sourceImage) {
      toast.error('Source image URL required');
      return;
    }
    if (!customBackground) {
      toast.warning('No custom background provided — "custom" preset will return an error (expected).');
    }
    await Promise.all(PRESETS.map((p) => runPreset(p.id)));
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold">AI Background QA</h1>
        <p className="text-sm text-muted-foreground">
          Internal test of the 5 background presets. Not exposed publicly.
        </p>
      </div>

      {/* ── Official Workshop Background ── */}
      <Card className="p-5 space-y-4 border-2 border-amber-500/30">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold">Official Workshop Background</h2>
            <p className="text-xs text-muted-foreground mt-1">
              This image is used as a visual reference for <code className="font-mono">system_workshop</code> generations.
            </p>
          </div>
          {loadingBg ? (
            <Badge variant="secondary">Loading...</Badge>
          ) : officialBg ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Active
            </Badge>
          ) : (
            <Badge variant="outline">Not configured</Badge>
          )}
        </div>

        <div className="flex gap-4 items-start flex-wrap">
          <div className="w-48 h-48 bg-muted rounded border flex items-center justify-center overflow-hidden">
            {officialBg ? (
              <img src={officialBg} alt="Official background" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-10 h-10 text-muted-foreground" />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadBg(f);
                  e.target.value = '';
                }}
                disabled={uploadingBg}
              />
              <Button asChild disabled={uploadingBg}>
                <span>
                  {uploadingBg ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {officialBg ? 'Replace Background' : 'Upload Background'}
                </span>
              </Button>
            </label>
            {officialBg && (
              <Button variant="outline" onClick={handleRemoveBg} disabled={uploadingBg}>
                <Trash2 className="w-4 h-4 mr-2" /> Remove Background
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ── Preset test runner ── */}
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
        <div className="flex gap-2 items-center flex-wrap">
          <Button onClick={runAll} disabled={!sourceImage}>
            Run all 5 presets
          </Button>
          <span className="text-xs text-muted-foreground">
            <code className="font-mono">system_workshop</code> will use:{' '}
            <strong>
              {officialBg ? 'Text prompt + official background reference' : 'Text prompt only'}
            </strong>
          </span>
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
                {p.id === 'system_workshop' && (
                  <div className="text-[9px] mt-1 text-amber-600">
                    {r.usedReference
                      ? '+ official background reference'
                      : 'text prompt only'}
                  </div>
                )}
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
