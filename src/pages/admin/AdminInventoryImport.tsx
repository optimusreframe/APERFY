import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { AlertCircle, CheckCircle2, FileArchive, FileUp, Loader2, PackageCheck, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminPageHeader, AdminSurface } from './_shared';
import { useToast } from '@/hooks/use-toast';
import { buildImportPreview } from '@/lib/inventory-import/preview';
import { INVENTORY_CATEGORIES } from '@/lib/inventory-import/taxonomy';
import type { ImportPreview, InventorySourceRow } from '@/lib/inventory-import/types';

export interface ParsedInventoryArchive {
  zip: JSZip;
  preview: ImportPreview;
}

export function isImportButtonDisabled(preview: ImportPreview | null, archiveReady: boolean): boolean {
  return !archiveReady || !preview?.canImport;
}

function isImagePath(path: string): boolean {
  return /\.(?:jpe?g|png|webp)$/i.test(path) && !path.endsWith('/');
}

export async function parseInventoryArchive(file: File, existingSlugs: Set<string>): Promise<ParsedInventoryArchive> {
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files);
  const workbookEntry = entries.find((entry) => !entry.dir && /(?:^|\/)inventory\.xlsx$/i.test(entry.name));
  if (!workbookEntry) throw new Error('El ZIP debe contener un archivo inventory.xlsx.');

  const workbookBuffer = await workbookEntry.async('arraybuffer');
  const workbook = XLSX.read(workbookBuffer, { type: 'array', cellDates: false });
  const worksheet = workbook.Sheets.Inventory || workbook.Sheets[workbook.SheetNames[0]];
  if (!worksheet) throw new Error('No se encontró la hoja Inventory en el workbook.');

  const rows = XLSX.utils.sheet_to_json<InventorySourceRow>(worksheet, { defval: null, raw: true });
  if (rows.length === 0) throw new Error('La hoja Inventory no contiene filas de productos.');

  const photoNames = new Set(entries.filter((entry) => isImagePath(entry.name)).map((entry) => entry.name));
  return { zip, preview: buildImportPreview(rows, photoNames, existingSlugs) };
}

function Metric({ label, value, tone = 'text-foreground' }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-secondary/30 p-4">
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className={`mt-2 text-2xl font-display font-bold ${tone}`}>{value}</div>
    </div>
  );
}

export default function AdminInventoryImport() {
  const { toast } = useToast();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [archive, setArchive] = useState<ParsedInventoryArchive | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: existingSlugs = new Set<string>(), isLoading: loadingSlugs } = useQuery({
    queryKey: ['inventory-import-existing-slugs'],
    queryFn: async () => {
      const { data, error: queryError } = await supabase.from('products').select('slug');
      if (queryError) throw queryError;
      return new Set((data ?? []).map((row) => row.slug));
    },
  });

  const handleArchive = async (file: File | undefined) => {
    if (!file) return;
    setParsing(true);
    setError(null);
    setPreview(null);
    setArchive(null);
    try {
      const parsed = await parseInventoryArchive(file, existingSlugs);
      setArchive(parsed);
      setPreview(parsed.preview);
      toast({ title: 'Preview listo', description: `${parsed.preview.totalRows} filas analizadas.` });
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : 'No se pudo leer el ZIP.';
      setError(message);
      toast({ title: 'ZIP inválido', description: message, variant: 'destructive' });
    } finally {
      setParsing(false);
    }
  };

  const canImport = !isImportButtonDisabled(preview, Boolean(archive));
  const issueRows = preview?.rows.filter((row) => row.issues.length > 0) ?? [];

  return (
    <div className="max-w-[1500px] mx-auto">
      <AdminPageHeader
        eyebrow="catalog · inventory import"
        title="Inventory Import"
        meta="Preview required before any product write"
        actions={(
          <label className="inline-flex">
            <input
              type="file"
              accept=".zip,application/zip"
              className="sr-only"
              disabled={parsing || loadingSlugs}
              onChange={(event) => { void handleArchive(event.target.files?.[0]); event.currentTarget.value = ''; }}
            />
            <Button asChild disabled={parsing || loadingSlugs} className="gap-2 bg-gradient-gold text-primary-foreground">
              <span><Upload className="h-4 w-4" />{parsing ? 'Reading…' : 'Choose ZIP'}</span>
            </Button>
          </label>
        )}
      />

      <div className="space-y-5">
        <AdminSurface className="p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-3"><FileArchive className="h-5 w-5 text-primary" /></div>
              <div>
                <h2 className="font-display text-lg font-semibold">Source archive</h2>
                <p className="mt-1 text-sm text-muted-foreground">Select the ZIP containing <code>inventory.xlsx</code> and its product photos.</p>
              </div>
            </div>
            {parsing && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Parsing workbook and photos…</div>}
          </div>
          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}
            </div>
          )}
        </AdminSurface>

        {preview && (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <Metric label="Rows" value={preview.totalRows} />
              <Metric label="Photos" value={`${preview.totalReferencedPhotos}/${preview.totalPhotos}`} />
              <Metric label="Units" value={preview.totalQuantity.toLocaleString()} />
              <Metric label="Duplicates" value={preview.duplicateNames.length} tone="text-amber-400" />
              <Metric label="Fallbacks" value={preview.fallbackRows.length} tone={preview.fallbackRows.length ? 'text-amber-400' : 'text-emerald-400'} />
            </div>

            <AdminSurface className="p-5 md:p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold">Import readiness</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Every row must have one category, price, quantity, description and matching photo.</p>
                </div>
                <Badge variant={canImport ? 'default' : 'destructive'} className={canImport ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : ''}>
                  {canImport ? 'READY FOR IMPORT' : `${issueRows.length} ROWS NEED REVIEW`}
                </Badge>
              </div>
              {preview.slugConflicts.length > 0 && (
                <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  Existing slug conflicts: {preview.slugConflicts.map((conflict) => `${conflict.slug} (row ${conflict.rowNumber})`).join(', ')}
                </div>
              )}
              {Object.keys(preview.missingFields).length > 0 && (
                <div className="mt-4 grid gap-2 md:grid-cols-3">
                  {Object.entries(preview.missingFields).map(([field, count]) => <div key={field} className="text-xs text-destructive">{field}: {count}</div>)}
                </div>
              )}
              <Button className="mt-5 w-full gap-2" disabled={!canImport} title="Persistence is enabled in the next import step">
                <PackageCheck className="h-4 w-4" />Import products
              </Button>
            </AdminSurface>

            <AdminSurface className="p-5 md:p-6">
              <h2 className="font-display text-lg font-semibold">Category distribution</h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {INVENTORY_CATEGORIES.map((category) => (
                  <div key={category.slug} className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/20 px-3 py-2.5">
                    <span className="text-sm">{category.name_en}</span>
                    <span className="font-mono text-xs text-muted-foreground">{preview.categoryCounts[category.slug] ?? 0}</span>
                  </div>
                ))}
              </div>
            </AdminSurface>

            <AdminSurface className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
                <div><h2 className="font-display text-lg font-semibold">Row preview</h2><p className="mt-1 text-xs text-muted-foreground">Showing the first 20 rows; fallback decisions remain visible before import.</p></div>
                {archive && <div className="flex items-center gap-2 text-xs text-emerald-400"><CheckCircle2 className="h-4 w-4" />Archive loaded</div>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-secondary/30 text-[10px] font-mono uppercase tracking-wider text-muted-foreground"><tr><th className="px-5 py-3">Row</th><th className="px-5 py-3">Product</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Price</th><th className="px-5 py-3">Qty</th><th className="px-5 py-3">Photo</th><th className="px-5 py-3">Status</th></tr></thead>
                  <tbody>
                    {preview.rows.slice(0, 20).map((row) => (
                      <tr key={row.sourceRowNumber} className="border-t border-border/50 align-top">
                        <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{row.sourceRowNumber}</td>
                        <td className="max-w-[260px] px-5 py-3"><div className="truncate font-medium">{row.name || '—'}</div><div className="truncate text-xs text-muted-foreground">{row.brand} {row.model}</div></td>
                        <td className="px-5 py-3"><div>{row.categorySlug}</div><div className="max-w-[260px] text-xs text-muted-foreground">{row.categoryReason}</div></td>
                        <td className="px-5 py-3 font-mono">{row.unitPrice === null ? '—' : `$${row.unitPrice.toFixed(2)}`}</td>
                        <td className="px-5 py-3 font-mono">{row.quantity ?? '—'}</td>
                        <td className="px-5 py-3 text-xs">{row.photoFileName || '—'}</td>
                        <td className="px-5 py-3">{row.issues.length ? <span className="text-xs text-destructive">{row.issues.join(', ')}</span> : <span className="text-xs text-emerald-400">Valid</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AdminSurface>
          </>
        )}

        {!preview && !parsing && (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/20 px-6 py-16 text-center">
            <FileUp className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-4 font-display text-lg">No inventory preview yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Choose the ZIP to validate the complete import before writing anything.</p>
          </div>
        )}
      </div>
    </div>
  );
}
