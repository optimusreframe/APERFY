const LEGACY_TERMS = [
  '3dtoprint', '3d to print', '3d printing', 'print service', 'custom print',
  'stl', 'obj', 'filament', 'pla', 'petg', 'abs', 'resin', 'slicer',
  'upload model', 'model upload', 'instant quote', 'model request', '3dmodels',
] as const;

export function findLegacyCommercialTerms(text: string): string[] {
  const normalized = text.toLowerCase();
  return LEGACY_TERMS.filter(term => {
    const pattern = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    return new RegExp(`\\b${pattern}s?\\b`, 'i').test(normalized);
  });
}

export function isTechnicalPrintReference(text: string): boolean {
  const normalized = text.toLowerCase().replace(/\s+/g, '');
  return normalized === 'window.print()' || normalized === '@mediaprint';
}

export const legacyCommercialTerms = LEGACY_TERMS;
