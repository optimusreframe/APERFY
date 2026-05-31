import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Loader2, ImageIcon, AlertTriangle, Upload, Trash2, CheckCircle2,
  Sparkles, Star, Eye, RefreshCw, Download, Link2, Save, ShieldAlert, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import ProductImageSourcePicker from '@/components/admin/ProductImageSourcePicker';
import { compositeNonAi, saveNonAiComposite, downloadRemoteImage, copyToClipboard, type NonAiPlacement } from '@/lib/non-ai-composite';


const LAST_SOURCE_KEY = 'bgqa.lastSourceImage';

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

const BG_PRESETS = [
  'system_workshop',
  'system_macro',
  'system_dark_premium',
  'premium_tech_plinth',
] as const;
type BgPreset = (typeof BG_PRESETS)[number];

const DEFAULT_PROMPTS: Record<BgPreset, string> = {
  system_workshop: 'Empty premium 3D printing workshop product photography background. Brushed grey metallic workbench, blurred FDM 3D printer, orange/teal filament bokeh, shallow depth of field, premium ecommerce look.',
  system_macro: 'Empty macro-style premium 3D printing workshop background. Brushed metallic tabletop, very shallow DOF, heavy blur, close-up product photography composition.',
  system_dark_premium: 'Empty premium dark cinematic 3D printing studio. Brushed dark metallic workbench, low-key luxury lighting, cool rim glow, warm orange accents.',
  premium_tech_plinth: 'Empty luxury tech display. Dark carbon-fiber plinth, dark blue/grey geometric forms, copper/gold accents, premium cyber-tech aesthetic.',
};

interface Result {
  status: 'idle' | 'loading' | 'done' | 'error';
  image?: string;
  error?: string;
  ms?: number;
  usedReference?: boolean;
}

interface Candidate {
  id: string;
  preset: string;
  image_url: string;
  prompt: string | null;
  source: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminBackgroundQA() {
  const [sourceImage, setSourceImageState] = useState(() => {
    try { return localStorage.getItem(LAST_SOURCE_KEY) || ''; } catch { return ''; }
  });
  const setSourceImage = (url: string) => {
    setSourceImageState(url);
    try { if (url) localStorage.setItem(LAST_SOURCE_KEY, url); } catch {/* ignore */}
  };
  const [customBackground, setCustomBackground] = useState('');
  const [results, setResults] = useState<Record<Preset, Result>>(() =>
    PRESETS.reduce((acc, p) => ({ ...acc, [p.id]: { status: 'idle' } }), {} as Record<Preset, Result>)
  );

  // ── Official background ──
  const [officialBg, setOfficialBg] = useState<string | null>(null);
  const [loadingBg, setLoadingBg] = useState(true);
  const [uploadingBg, setUploadingBg] = useState(false);

  // ── AI generator ──
  const [genPreset, setGenPreset] = useState<BgPreset>('system_workshop');
  const [genCount, setGenCount] = useState<'1' | '4' | '8'>('4');
  const [genPromptOverride, setGenPromptOverride] = useState('');
  const [generating, setGenerating] = useState(false);

  // ── Candidates gallery ──
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filterPreset, setFilterPreset] = useState<'all' | BgPreset>('all');
  const [loadingCandidates, setLoadingCandidates] = useState(true);

  // ── Preview with product dialog ──
  const [previewing, setPreviewing] = useState<Candidate | null>(null);
  const [previewSource, setPreviewSource] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

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

  const fetchCandidates = async () => {
    setLoadingCandidates(true);
    const { data, error } = await supabase
      .from('system_background_candidates')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      toast.error(error.message);
    } else {
      setCandidates((data || []) as Candidate[]);
    }
    setLoadingCandidates(false);
  };

  useEffect(() => {
    fetchOfficialBg();
    fetchCandidates();
  }, []);

  const activeCandidate = useMemo(
    () => candidates.find((c) => c.image_url === officialBg) || null,
    [candidates, officialBg]
  );

  const filteredCandidates = useMemo(
    () => candidates.filter((c) => filterPreset === 'all' || c.preset === filterPreset),
    [candidates, filterPreset]
  );

  // ── Official BG: upsert URL into admin_settings ──
  const setOfficialUrl = async (url: string | null) => {
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
  };

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
      await setOfficialUrl(url);

      // Persist as a manual candidate so origin/date can be displayed
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from('system_background_candidates').insert({
        preset: 'system_workshop',
        image_url: url,
        prompt: null,
        source: 'manual',
        is_active: true,
        created_by: userData.user?.id,
      });
      // Mark all other candidates inactive
      await supabase
        .from('system_background_candidates')
        .update({ is_active: false })
        .neq('image_url', url);

      toast.success('Official background updated');
      setOfficialBg(url);
      fetchCandidates();
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploadingBg(false);
    }
  };

  const handleRemoveBg = async () => {
    if (!confirm('Remove the official workshop background?')) return;
    try {
      await setOfficialUrl(null);
      await supabase.from('system_background_candidates').update({ is_active: false }).eq('is_active', true);
      setOfficialBg(null);
      toast.success('Official background removed');
      fetchCandidates();
    } catch (e: any) {
      toast.error(e.message || 'Remove failed');
    }
  };

  // ── AI generation ──
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-product-import', {
        body: {
          action: 'generate_background_reference',
          preset: genPreset,
          count: Number(genCount),
          promptOverride: genPromptOverride.trim() || undefined,
        },
      });
      if (error) throw new Error(error.message);
      const made = data?.candidates?.length || 0;
      if (made === 0) {
        toast.error(data?.errors?.[0] || 'No variants generated');
      } else {
        toast.success(`Generated ${made} background${made === 1 ? '' : 's'}`);
        if (data?.errors?.length) {
          toast.warning(`${data.errors.length} variant(s) failed`);
        }
      }
      fetchCandidates();
    } catch (e: any) {
      toast.error(e.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  // ── Candidate actions ──
  const setAsOfficial = async (c: Candidate) => {
    try {
      await setOfficialUrl(c.image_url);
      // Mark this active, others inactive
      await supabase.from('system_background_candidates').update({ is_active: false }).neq('id', c.id);
      await supabase.from('system_background_candidates').update({ is_active: true }).eq('id', c.id);
      setOfficialBg(c.image_url);
      toast.success('Set as official background');
      fetchCandidates();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    }
  };

  const deleteCandidate = async (c: Candidate) => {
    if (c.is_active && !confirm('This is the ACTIVE official background. Delete anyway?')) return;
    if (!c.is_active && !confirm('Delete this background candidate?')) return;
    try {
      // Best-effort storage delete (only AI-generated paths live in system-backgrounds)
      try {
        const marker = '/storage/v1/object/public/system-backgrounds/';
        const idx = c.image_url.indexOf(marker);
        if (idx >= 0) {
          const path = c.image_url.substring(idx + marker.length);
          await supabase.storage.from('system-backgrounds').remove([path]);
        }
      } catch {/* non-fatal */}
      const { error } = await supabase.from('system_background_candidates').delete().eq('id', c.id);
      if (error) throw error;
      if (c.is_active) {
        await setOfficialUrl(null);
        setOfficialBg(null);
      }
      toast.success('Deleted');
      fetchCandidates();
    } catch (e: any) {
      toast.error(e.message || 'Delete failed');
    }
  };

  const regenerateSimilar = async (c: Candidate) => {
    if (!BG_PRESETS.includes(c.preset as BgPreset)) {
      toast.error('Preset not supported for regeneration');
      return;
    }
    setGenPreset(c.preset as BgPreset);
    setGenPromptOverride(c.prompt || '');
    setGenCount('1');
    toast.info('Prompt copied — click "Generate AI Backgrounds"');
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  // ── Preview with product ──
  const openPreview = (c: Candidate) => {
    setPreviewing(c);
    setPreviewSource(sourceImage);
    setPreviewResult(null);
    setPreviewError(null);
  };

  const runPreview = async () => {
    if (!previewing) return;
    if (!previewSource) {
      setPreviewError('Source image URL is required');
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('ai-product-import', {
        body: {
          action: 'generate_image',
          sourceImage: previewSource,
          backgroundMode: 'system_workshop',
          customBackground: previewing.image_url,
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Unknown error');
      setPreviewResult(data.data?.generated_image);
    } catch (e: any) {
      setPreviewError(e.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  // ── QA runner ──
  const runPreset = async (preset: Preset) => {
    const willUseReference = preset === 'system_workshop' && !!officialBg;
    setResults((r) => ({ ...r, [preset]: { status: 'loading', usedReference: willUseReference } }));
    const t0 = performance.now();
    try {
      const payload: Record<string, unknown> = {
        action: 'generate_image',
        sourceImage,
        backgroundMode: preset,
      };
      if (preset === 'custom') payload.customBackground = customBackground;

      const { data, error } = await supabase.functions.invoke('ai-product-import', { body: payload });
      const ms = Math.round(performance.now() - t0);
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Unknown error');
      setResults((r) => ({
        ...r,
        [preset]: { status: 'done', image: data.data?.generated_image, ms, usedReference: willUseReference },
      }));
    } catch (e: any) {
      setResults((r) => ({ ...r, [preset]: { status: 'error', error: e.message, usedReference: willUseReference } }));
    }
  };

  const runAll = async () => {
    if (!sourceImage) {
      toast.error('Source image URL required');
      return;
    }
    if (!customBackground) {
      toast.warning('No custom background — "custom" preset will return an error (expected).');
    }
    await Promise.all(PRESETS.map((p) => runPreset(p.id)));
  };

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Background Studio &amp; QA</h1>
          <p className="text-sm text-muted-foreground">
            Internal admin tools. Generate, manage and test system backgrounds.
          </p>
        </div>

        {/* ── A. Official Workshop Background ── */}
        <Card className="p-5 space-y-4 border-2 border-amber-500/30">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">Official Workshop Background</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Used as visual reference for <code className="font-mono">system_workshop</code> generations.
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
            <div className="w-56 h-56 bg-muted rounded border flex items-center justify-center overflow-hidden">
              {officialBg ? (
                <img src={officialBg} alt="Official background" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-10 h-10 text-muted-foreground" />
              )}
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Preset:</span>{' '}
                <code className="font-mono">{activeCandidate?.preset || 'system_workshop'}</code>
              </div>
              <div>
                <span className="text-muted-foreground">Origin:</span>{' '}
                {activeCandidate ? (
                  <Badge variant="outline" className="text-[10px]">
                    {activeCandidate.source === 'ai' ? 'AI' : 'Manual'}
                  </Badge>
                ) : officialBg ? (
                  <Badge variant="outline" className="text-[10px]">Manual (legacy)</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Created:</span>{' '}
                {activeCandidate
                  ? new Date(activeCandidate.created_at).toLocaleString()
                  : <span className="text-muted-foreground">—</span>}
              </div>

              <div className="flex gap-2 mt-2 flex-wrap">
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
                  <Button asChild size="sm" disabled={uploadingBg}>
                    <span>
                      {uploadingBg
                        ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        : <Upload className="w-4 h-4 mr-2" />}
                      {officialBg ? 'Replace' : 'Upload manual background'}
                    </span>
                  </Button>
                </label>
                {officialBg && (
                  <Button variant="outline" size="sm" onClick={handleRemoveBg} disabled={uploadingBg}>
                    <Trash2 className="w-4 h-4 mr-2" /> Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* ── B. AI Background Generator ── */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold">AI Background Generator</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Preset</Label>
              <Select value={genPreset} onValueChange={(v) => setGenPreset(v as BgPreset)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BG_PRESETS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Variants</Label>
              <Select value={genCount} onValueChange={(v) => setGenCount(v as '1' | '4' | '8')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex flex-col justify-end">
              <Button onClick={handleGenerate} disabled={generating}>
                {generating
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
                  : <><Sparkles className="w-4 h-4 mr-2" /> Generate AI Backgrounds</>}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Prompt override (optional)</Label>
            <Textarea
              rows={3}
              value={genPromptOverride}
              onChange={(e) => setGenPromptOverride(e.target.value)}
              placeholder={DEFAULT_PROMPTS[genPreset]}
            />
            <p className="text-[10px] text-muted-foreground">
              Leave blank to use the default prompt for the selected preset.
            </p>
          </div>
        </Card>

        {/* ── C. Generated Background Variants ── */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-lg font-semibold">Generated Background Variants</h2>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Filter:</Label>
              <Select value={filterPreset} onValueChange={(v) => setFilterPreset(v as any)}>
                <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All presets</SelectItem>
                  {BG_PRESETS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={fetchCandidates}>
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {loadingCandidates ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : filteredCandidates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No background candidates yet. Generate some above.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCandidates.map((c) => (
                <Card key={c.id} className={`p-3 space-y-2 flex flex-col ${c.is_active ? 'ring-2 ring-emerald-500' : ''}`}>
                  <div className="aspect-square bg-muted rounded overflow-hidden">
                    <img src={c.image_url} alt={c.preset} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <code className="text-[10px] font-mono truncate">{c.preset}</code>
                    <Badge variant={c.source === 'ai' ? 'default' : 'outline'} className="text-[9px]">
                      {c.source === 'ai' ? 'AI' : 'Manual'}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                    {c.is_active && (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" /> Active
                      </span>
                    )}
                  </div>
                  {c.prompt && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 cursor-help">
                          {c.prompt}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-md">
                        <p className="text-xs whitespace-pre-wrap">{c.prompt}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    <Button
                      size="sm"
                      variant={c.is_active ? 'outline' : 'default'}
                      className="h-7 text-[10px]"
                      disabled={c.is_active}
                      onClick={() => setAsOfficial(c)}
                    >
                      <Star className="w-3 h-3 mr-1" />
                      {c.is_active ? 'Official' : 'Set Official'}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => openPreview(c)}>
                      <Eye className="w-3 h-3 mr-1" /> Preview
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px]"
                      disabled={generating}
                      onClick={() => regenerateSimilar(c)}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" /> Similar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] text-destructive hover:text-destructive"
                      onClick={() => deleteCandidate(c)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>

        {/* ── Preset QA runner (existing) ── */}
        <Card className="p-4 space-y-4">
          <h2 className="text-lg font-semibold">Preset QA Runner</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <ProductImageSourcePicker
              label="Source Image (the 3D object)"
              value={sourceImage}
              onChange={setSourceImage}
            />
            <ProductImageSourcePicker
              label="Custom Background (only used by `custom` preset)"
              value={customBackground}
              onChange={setCustomBackground}
              hideLibrary
              uploadFolder="background-qa-custom"
            />
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Button onClick={runAll} disabled={!sourceImage}>Run all 5 presets</Button>
            <span className="text-xs text-muted-foreground">
              <code className="font-mono">system_workshop</code> will use:{' '}
              <strong>{officialBg ? 'Text prompt + official background reference' : 'Text prompt only'}</strong>
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
                      {r.usedReference ? '+ official background reference' : 'text prompt only'}
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

        {/* ── Preview with product dialog ── */}
        <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Preview with Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <ProductImageSourcePicker
                label="Source image (3D object)"
                value={previewSource}
                onChange={(url) => {
                  setPreviewSource(url);
                  if (url) setSourceImage(url);
                }}
              />
              <Button onClick={runPreview} disabled={previewLoading || !previewSource} className="w-full">
                {previewLoading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating product preview…</>
                  : <>Run Composition</>}
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Background candidate</p>
                  {previewing && (
                    <img src={previewing.image_url} alt="bg" className="w-full aspect-square object-cover rounded border" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Composed result</p>
                  <div className="w-full aspect-square bg-muted rounded border flex items-center justify-center overflow-hidden">
                    {previewLoading && <Loader2 className="w-8 h-8 animate-spin" />}
                    {!previewLoading && previewResult && (
                      <img src={previewResult} alt="result" className="w-full h-full object-cover" />
                    )}
                    {!previewLoading && !previewResult && previewError && (
                      <div className="p-2 text-xs text-destructive text-center">{previewError}</div>
                    )}
                    {!previewLoading && !previewResult && !previewError && (
                      <ImageIcon className="w-10 h-10 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
