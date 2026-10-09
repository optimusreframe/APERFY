export interface ProductSpecification {
  k: string;
  v: unknown;
}

function hasSpecificationValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value !== 'string') return true;

  const normalized = value.trim();
  return normalized.length > 0 && normalized !== '—';
}

export function filterEmptySpecifications<T extends ProductSpecification>(rows: T[]): T[] {
  return rows.filter((row) => hasSpecificationValue(row.v));
}
