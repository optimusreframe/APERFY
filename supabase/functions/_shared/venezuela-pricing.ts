export const DEFAULT_VENEZUELA_MARKUP_PERCENT = 40

function normalizedMarkup(value: unknown, fallback = DEFAULT_VENEZUELA_MARKUP_PERCENT): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(1000, Math.max(0, parsed))
}

export function calculateVenezuelaUsdPrice(product: Record<string, unknown>, globalMarkupPercent = DEFAULT_VENEZUELA_MARKUP_PERCENT): number | null {
  const basePrice = Number(product.base_price)
  if (!Number.isFinite(basePrice) || basePrice < 0) return null

  const mode = product.venezuela_price_mode === 'manual' ? 'manual' : 'global'
  const manualMode = product.venezuela_manual_mode === 'percentage' ? 'percentage' : 'fixed'
  if (mode === 'manual' && manualMode === 'fixed') {
    const fixed = Number(product.venezuela_price_usd)
    return Number.isFinite(fixed) && fixed >= 0 ? fixed : null
  }

  const markup = normalizedMarkup(mode === 'manual' ? product.venezuela_markup_percent : globalMarkupPercent)
  return Math.round(basePrice * (1 + markup / 100) * 100) / 100
}
