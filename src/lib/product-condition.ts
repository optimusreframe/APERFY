import type { InventorySourceRow } from './inventory-import/types';

export type ProductCondition = 'new' | 'used';

const usedPatterns = [
  /\bused\b/i,
  /\bpre[-\s]?owned\b/i,
  /\bopen[-\s]?box\b/i,
  /\brenewed\b/i,
  /\brefurb(?:ished)?\b/i,
  /\breturned\b/i,
  /\bdamaged\b/i,
  /\bscratch(?:ed|es)?\b/i,
  /\bfor parts\b/i,
  /\bas[-\s]?is\b/i,
];

const newPatterns = [
  /\bbrand new\b/i,
  /\bnew\b/i,
  /\bsealed\b/i,
  /\bunused\b/i,
];

function asText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

export function normalizeProductCondition(value: unknown): ProductCondition | null {
  const text = asText(value).toLowerCase();
  if (!text) return null;
  if (/^(?:used|pre[-\s]?owned|open[-\s]?box|renewed|refurb(?:ished)?|returned|damaged)$/.test(text)) return 'used';
  if (/^(?:new|brand new|sealed|unused)$/.test(text)) return 'new';
  if (usedPatterns.some((pattern) => pattern.test(text))) return 'used';
  if (newPatterns.some((pattern) => pattern.test(text))) return 'new';
  return null;
}

export function inferProductCondition(source: InventorySourceRow): ProductCondition {
  const explicit = normalizeProductCondition(source.Condition);
  if (explicit) return explicit;

  const descriptiveText = [source.Item, source.Brand, source.Model, source.Description]
    .map(asText)
    .filter(Boolean)
    .join(' ');
  return normalizeProductCondition(descriptiveText) ?? 'new';
}
