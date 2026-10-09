export type InventoryProduct = {
  inventory_enabled?: boolean | null;
  stock_quantity?: number | null;
  low_stock_threshold?: number | null;
};

export type InventoryState = 'untracked' | 'available' | 'low' | 'sold_out';

export function getInventoryState(product: InventoryProduct): InventoryState {
  if (!product.inventory_enabled) return 'untracked';
  const stock = Math.max(0, Number(product.stock_quantity ?? 0));
  if (stock <= 0) return 'sold_out';
  if (stock <= Math.max(0, Number(product.low_stock_threshold ?? 3))) return 'low';
  return 'available';
}

export function getInventoryLabel(state: InventoryState, stock: number, language: 'es' | 'en'): string {
  if (state === 'sold_out') return language === 'es' ? 'Agotado' : 'Sold out';
  if (state === 'low') return language === 'es' ? `Quedan ${stock}` : `${stock} left`;
  return language === 'es' ? 'Disponible' : 'Available';
}

export function getInventoryStock(product: InventoryProduct): number | null {
  return product.inventory_enabled ? Math.max(0, Number(product.stock_quantity ?? 0)) : null;
}
