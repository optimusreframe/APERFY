export function normalizeInventoryPath(value: string): string {
  return value.replace(/\\/g, '/');
}
