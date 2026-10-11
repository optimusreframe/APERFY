export const STOREFRONT_LAYOUT_SETTING_KEY = 'storefront_layout';

export type StorefrontDesign = 'design1' | 'design2' | 'design3' | 'design4';

export interface StorefrontLayoutConfig {
  design: StorefrontDesign;
}

export const DEFAULT_STOREFRONT_LAYOUT: StorefrontLayoutConfig = { design: 'design1' };

export const STOREFRONT_DESIGNS: Array<{
  id: StorefrontDesign;
  name: string;
  reference: string;
  summary: string;
  traits: string[];
}> = [
  {
    id: 'design1',
    name: 'APERFY actual',
    reference: 'Diseño 1',
    summary: 'El storefront actual, corregido para móvil y con la identidad APERFY.',
    traits: ['Editorial', 'Dark / Light', 'Catálogo flexible'],
  },
  {
    id: 'design2',
    name: 'Tech editorial',
    reference: 'Diseño 2 · Foto 8',
    summary: 'Portada tecnológica con foco en categorías, promociones y productos destacados.',
    traits: ['Tecnología', 'Promociones', 'Cards compactas'],
  },
  {
    id: 'design3',
    name: 'Luxury studio',
    reference: 'Diseño 3 · Foto 9',
    summary: 'Composición premium con superficies suaves, producto protagonista y más aire visual.',
    traits: ['Premium', 'Tipografía grande', 'Superficies suaves'],
  },
  {
    id: 'design4',
    name: 'Drops marketplace',
    reference: 'Diseño 4 · Foto 10',
    summary: 'Catálogo orientado a lanzamientos, marcas, disponibilidad y compra rápida.',
    traits: ['Drops', 'Marcas', 'Compra rápida'],
  },
];

function parseObject(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'object' && value !== null) return value as Record<string, unknown>;
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function parseStorefrontLayoutConfig(value: unknown): StorefrontLayoutConfig {
  const record = parseObject(value);
  const design = record?.design;
  return {
    design: design === 'design2' || design === 'design3' || design === 'design4' ? design : 'design1',
  };
}

export function serializeStorefrontLayoutConfig(config: StorefrontLayoutConfig): string {
  return JSON.stringify(parseStorefrontLayoutConfig(config));
}
