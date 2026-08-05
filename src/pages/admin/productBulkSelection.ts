export function toggleBulkSelection(selectedIds: string[], productId: string, checked: boolean): string[] {
  if (checked) return selectedIds.includes(productId) ? selectedIds : [...selectedIds, productId];
  return selectedIds.filter((id) => id !== productId);
}

export function toggleAllBulkSelection(selectedIds: string[], visibleIds: string[], checked: boolean): string[] {
  if (checked) return Array.from(new Set([...selectedIds, ...visibleIds]));
  return selectedIds.filter((id) => !visibleIds.includes(id));
}
