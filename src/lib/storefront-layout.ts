export const STOREFRONT_LAYOUT_SETTING_KEY = 'storefront_layout';

export type StorefrontDesign = 'design1' | 'design2' | 'design3' | 'design4';
export type StorefrontDevice = 'mobile' | 'tablet' | 'desktop';

export interface StorefrontLayoutConfig {
  mobile: StorefrontDesign;
  tablet: StorefrontDesign;
  desktop: StorefrontDesign;
}

export const DEFAULT_STOREFRONT_LAYOUT: StorefrontLayoutConfig = {
  mobile: 'design1',
  tablet: 'design1',
  desktop: 'design1',
};

export const STOREFRONT_DEVICES: Array<{
  id: StorefrontDevice;
  label: string;
  description: string;
}> = [
  { id: 'mobile', label: 'Móvil', description: 'Teléfonos · hasta 767 px' },
  { id: 'tablet', label: 'iPad', description: 'Tablets · 768–1023 px' },
  { id: 'desktop', label: 'Desktop', description: 'Pantallas · desde 1024 px' },
];

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

function isStorefrontDesign(value: unknown): value is StorefrontDesign {
  return value === 'design1' || value === 'design2' || value === 'design3' || value === 'design4';
}

export function parseStorefrontLayoutConfig(value: unknown): StorefrontLayoutConfig {
  const record = parseObject(value);
  const legacyDesign = record?.design;
  const fallback = isStorefrontDesign(legacyDesign) ? legacyDesign : 'design1';
  return {
    mobile: isStorefrontDesign(record?.mobile) ? record.mobile : fallback,
    tablet: isStorefrontDesign(record?.tablet) ? record.tablet : fallback,
    desktop: isStorefrontDesign(record?.desktop) ? record.desktop : fallback,
  };
}

export function serializeStorefrontLayoutConfig(config: StorefrontLayoutConfig): string {
  return JSON.stringify(parseStorefrontLayoutConfig(config));
}

export function getStorefrontDeviceForWidth(width: number): StorefrontDevice {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

export function getStorefrontDesignForWidth(config: StorefrontLayoutConfig, width: number): StorefrontDesign {
  return config[getStorefrontDeviceForWidth(width)];
}
