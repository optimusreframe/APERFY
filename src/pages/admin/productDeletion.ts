export function partitionProductDeletion(productIds: string[], referencedProductIds: string[]) {
  const referenced = new Set(referencedProductIds);
  return {
    deleteIds: productIds.filter((id) => !referenced.has(id)),
    archiveIds: productIds.filter((id) => referenced.has(id)),
  };
}
