import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { calculateVenezuelaUsdPrice, DEFAULT_VENEZUELA_MARKUP_PERCENT } from '../_shared/venezuela-pricing.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const BCV_URL = 'https://www.bcv.org.ve/'
const LAS_LUCAS_URL = 'https://laslucas.com/?c=bcv'
const LAS_LUCAS_FIRESTORE_URL = 'https://firestore.googleapis.com/v1/projects/laslucas-7b4fc/databases/(default)/documents/data/currencies'
const BINANCE_P2P_URL = 'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search'
const RATE_REFRESH_MS = 60 * 60 * 1000

type PricingRegion = 'USA' | 'VENEZUELA'
type PricingMode = 'global' | 'geo'
type RateSource = 'bcv' | 'laslucas' | 'binance' | 'manual'

type Pricing = {
  region: PricingRegion
  mode: PricingMode
  currency: 'USD'
  bcvRate: number | null
  rateSource: RateSource | null
  rateUpdatedAt: string | null
  globalVenezuelaMarkupPercent: number
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

function getRegion(req: Request): PricingRegion {
  // These headers are injected by the edge/CDN and are intentionally used only
  // for classification. Unknown locations fail closed to Venezuela so the USA
  // price list is never granted by an ambiguous request.
  const country = req.headers.get('cf-ipcountry')
  const normalizedCountry = country && /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : null
  return normalizedCountry === 'US' ? 'USA' : 'VENEZUELA'
}

function parseBcvNumber(value: string): number {
  const normalized = value.trim().replace(/\s/g, '')
  const european = normalized.includes(',')
    ? normalized.replace(/\./g, '').replace(',', '.')
    : normalized.replace(/,/g, '')
  const rate = Number(european)
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('Invalid BCV exchange rate')
  return rate
}

export function parseBcvRate(html: string): number {
  const match = html.match(/id=["']dolar["'][\s\S]*?<strong[^>]*>\s*([^<]+?)\s*<\/strong>/i)
  if (!match?.[1]) throw new Error('BCV dollar rate was not found')
  return parseBcvNumber(match[1])
}

async function fetchBcvRate(): Promise<number> {
  const response = await fetch(BCV_URL, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'es-VE,es;q=0.9,en;q=0.7',
      'User-Agent': 'Mozilla/5.0 (compatible; APERFY/1.0; +https://aperfy.kpwr.dev)',
    },
  })
  if (!response.ok) throw new Error(`BCV returned ${response.status}`)
  return parseBcvRate(await response.text())
}

function firestoreNumber(value: unknown): number | null {
  if (!value || typeof value !== 'object') return null
  const field = value as Record<string, unknown>
  const raw = field.doubleValue ?? field.integerValue ?? field.stringValue
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

async function fetchLasLucasRate(source: 'bcv' | 'binance'): Promise<number> {
  const response = await fetch(LAS_LUCAS_FIRESTORE_URL, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Las Lucas returned ${response.status}`)
  const payload = await response.json() as Record<string, unknown>
  const fields = (payload.fields as Record<string, unknown> | undefined)?.USD as Record<string, unknown> | undefined
  const usdFields = (fields?.mapValue as Record<string, unknown> | undefined)?.fields as Record<string, unknown> | undefined
  const rate = firestoreNumber(usdFields?.[source])
  if (!rate) throw new Error(`Las Lucas ${source} rate was not found`)
  return rate
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

async function fetchBinanceRate(): Promise<number> {
  const response = await fetch(BINANCE_P2P_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      page: 1,
      rows: 10,
      payTypes: [],
      publisherType: null,
      asset: 'USDT',
      fiat: 'VES',
      // BUY returns the current sell offers a Venezuelan customer would use
      // to acquire USDT, which is the useful direction for USD -> VES display.
      tradeType: 'BUY',
      transAmount: '',
      countries: [],
    }),
  })
  if (!response.ok) throw new Error(`Binance P2P returned ${response.status}`)
  const payload = await response.json() as { data?: Array<{ adv?: { price?: unknown } }> }
  const prices = (payload.data ?? []).map((item) => Number(item.adv?.price)).filter((value) => Number.isFinite(value) && value > 0)
  if (!prices.length) throw new Error('Binance P2P rate was not found')
  return median(prices)
}

function isRateSource(value: unknown): value is RateSource {
  return value === 'bcv' || value === 'laslucas' || value === 'binance' || value === 'manual'
}

async function getRateSource(admin: SupabaseClient): Promise<RateSource> {
  const { data } = await admin.from('admin_settings').select('setting_value').eq('setting_key', 'regional_pricing_rate_source').maybeSingle()
  return isRateSource(data?.setting_value) ? data.setting_value : 'bcv'
}

async function fetchRate(source: Exclude<RateSource, 'manual'>): Promise<number> {
  if (source === 'bcv') {
    try {
      return await fetchBcvRate()
    } catch (error) {
      // Las Lucas exposes the BCV value as a separate field and is used only
      // as a transport fallback when the BCV site blocks the edge runtime.
      console.warn('Direct BCV page unavailable; using Las Lucas BCV mirror', error)
      return await fetchLasLucasRate('bcv')
    }
  }
  if (source === 'laslucas') return fetchLasLucasRate('bcv')
  try {
    return await fetchBinanceRate()
  } catch (error) {
    console.warn('Direct Binance P2P unavailable; using Las Lucas Binance reference', error)
    return await fetchLasLucasRate('binance')
  }
}

async function getMode(admin: SupabaseClient): Promise<PricingMode> {
  const { data } = await admin.from('admin_settings').select('setting_value').eq('setting_key', 'regional_pricing_mode').maybeSingle()
  return data?.setting_value === 'global' ? 'global' : 'geo'
}

async function getGlobalVenezuelaMarkup(admin: SupabaseClient): Promise<number> {
  const { data } = await admin.from('admin_settings').select('setting_value').eq('setting_key', 'venezuela_global_markup_percent').maybeSingle()
  const parsed = Number(data?.setting_value)
  return Number.isFinite(parsed) ? Math.min(1000, Math.max(0, parsed)) : DEFAULT_VENEZUELA_MARKUP_PERCENT
}

async function getRate(admin: SupabaseClient, source: RateSource, refresh = false): Promise<{ rate: number; source: RateSource; fetchedAt: string | null } | null> {
  const { data: current } = await admin.from('currency_rates').select('*').eq('base_currency', 'USD').eq('quote_currency', 'VES').eq('source', source).eq('is_active', true).order('updated_at', { ascending: false }).limit(1).maybeSingle()
  const fetchedAt = current?.fetched_at ? Date.parse(current.fetched_at) : 0
  if (!refresh && current?.rate && (source === 'manual' || (fetchedAt && Date.now() - fetchedAt < RATE_REFRESH_MS))) {
    return { rate: Number(current.rate), source, fetchedAt: current.fetched_at ?? null }
  }
  if (source === 'manual') return current?.rate ? { rate: Number(current.rate), source, fetchedAt: current.fetched_at ?? null } : null

  try {
    const rate = await fetchRate(source)
    const fetchedAtValue = new Date().toISOString()
    const { error } = await admin.from('currency_rates').upsert({
      base_currency: 'USD', quote_currency: 'VES', rate,
      source, is_automatic: true, is_active: true,
      source_url: source === 'bcv' ? BCV_URL : source === 'laslucas' ? LAS_LUCAS_URL : BINANCE_P2P_URL,
      fetched_at: fetchedAtValue,
      updated_at: fetchedAtValue,
    }, { onConflict: 'base_currency,quote_currency,source' })
    if (error) throw error
    return { rate, source, fetchedAt: fetchedAtValue }
  } catch (error) {
    console.warn(`Could not refresh ${source} rate; using the last saved rate`, error)
    return current?.rate ? { rate: Number(current.rate), source, fetchedAt: current.fetched_at ?? null } : null
  }
}

function publicProduct(row: Record<string, unknown>, pricing: Pricing) {
  const category = row.categories && typeof row.categories === 'object' ? row.categories : null
  const rawVenezuelaPrice = calculateVenezuelaUsdPrice(row, pricing.globalVenezuelaMarkupPercent)
  const effectivePrice = pricing.mode === 'geo' && pricing.region === 'VENEZUELA'
    ? rawVenezuelaPrice
    : Number(row.base_price)
  if (!Number.isFinite(effectivePrice) || effectivePrice === null || effectivePrice < 0) return null
  if (pricing.mode === 'geo' && pricing.region === 'VENEZUELA' && rawVenezuelaPrice === null) return null

  return {
    id: row.id,
    brand: row.brand,
    name_en: row.name_en,
    name_es: row.name_es,
    description_en: row.description_en,
    description_es: row.description_es,
    slug: row.slug,
    base_price: effectivePrice,
    category_id: row.category_id,
    is_active: row.is_active,
    is_featured: row.is_featured,
    images: row.images,
    created_at: row.created_at,
    updated_at: row.updated_at,
    seller_name: row.seller_name,
    return_policy_en: row.return_policy_en,
    return_policy_es: row.return_policy_es,
    return_window_days: row.return_window_days,
    condition_status: row.condition_status,
    model_3d_url: row.model_3d_url,
    inventory_enabled: row.inventory_enabled,
    stock_quantity: row.stock_quantity,
    low_stock_threshold: row.low_stock_threshold,
    inventory_source_key: row.inventory_source_key,
    categories: category,
    price_ves: pricing.bcvRate ? effectivePrice * pricing.bcvRate : null,
  }
}

function publicVariation(row: Record<string, unknown>, pricing: Pricing) {
  const useVenezuela = pricing.mode === 'geo' && pricing.region === 'VENEZUELA'
  const venezuelaOverride = row.price_override_venezuela == null ? null : Number(row.price_override_venezuela)
  return {
    id: row.id,
    product_id: row.product_id,
    name_en: row.name_en,
    name_es: row.name_es,
    type: row.type,
    value: row.value,
    price_modifier: useVenezuela && row.use_manual_price ? 0 : row.price_modifier,
    price_override: useVenezuela ? venezuelaOverride : row.price_override,
    use_manual_price: useVenezuela ? Boolean(row.use_manual_price && venezuelaOverride !== null) : row.use_manual_price,
    is_active: row.is_active,
    created_at: row.created_at,
    material_id: row.material_id,
    weight_grams: row.weight_grams,
    dimensions: row.dimensions,
    image_url: row.image_url,
  }
}

async function requireAdmin(req: Request, admin: SupabaseClient) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData.user) return null
  const { data: role } = await admin.from('user_roles').select('role').eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle()
  return role ? userData.user : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Server configuration error' }, 500)
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })

  try {
    const body = await req.json().catch(() => ({})) as {
      action?: string
      slug?: string
      productIds?: unknown
      variationIds?: unknown
      refresh?: boolean
      rate?: unknown
      source?: unknown
    }

    if (body.action === 'refresh-rate') {
      const user = await requireAdmin(req, admin)
      if (!user) return json({ error: 'Admin access required' }, 403)
      const requestedSource = isRateSource(body.source) ? body.source : await getRateSource(admin)
      const manualRate = Number(body.rate)
      if (requestedSource === 'manual' && (!Number.isFinite(manualRate) || manualRate <= 0)) {
        return json({ error: 'A manual rate greater than zero is required' }, 400)
      }
      const resolved = Number.isFinite(manualRate) && manualRate > 0
        ? { rate: manualRate, source: 'manual' as const, fetchedAt: new Date().toISOString() }
        : await getRate(admin, requestedSource, true)
      if (!resolved) return json({ error: `${requestedSource} rate is unavailable` }, 503)
      if (Number.isFinite(manualRate) && manualRate > 0) {
        const fetchedAt = new Date().toISOString()
        const { error } = await admin.from('currency_rates').upsert({
          base_currency: 'USD', quote_currency: 'VES', rate: manualRate,
          source: 'manual', is_automatic: false, is_active: true,
          updated_by: user.id, updated_at: fetchedAt, fetched_at: fetchedAt,
        }, { onConflict: 'base_currency,quote_currency,source' })
        if (error) throw error
      }
      return json({ ok: true, rate: resolved.rate, source: resolved.source, fetchedAt: resolved.fetchedAt })
    }

    const region = getRegion(req)
    const mode = await getMode(admin)
    const rateSource = await getRateSource(admin)
    const globalVenezuelaMarkupPercent = await getGlobalVenezuelaMarkup(admin)
    const resolvedRate = region === 'VENEZUELA' ? await getRate(admin, rateSource, Boolean(body.refresh)) : null
    const pricing: Pricing = {
      region,
      mode,
      currency: 'USD',
      bcvRate: resolvedRate?.rate ?? null,
      rateSource: resolvedRate?.source ?? rateSource,
      rateUpdatedAt: resolvedRate?.fetchedAt ?? null,
      globalVenezuelaMarkupPercent,
    }
    const productSelect = 'id,brand,name_en,name_es,description_en,description_es,slug,base_price,venezuela_price_usd,venezuela_price_mode,venezuela_manual_mode,venezuela_markup_percent,category_id,is_active,is_featured,images,created_at,updated_at,seller_name,return_policy_en,return_policy_es,return_window_days,condition_status,model_3d_url,inventory_enabled,stock_quantity,low_stock_threshold,inventory_source_key,categories(id,name_en,name_es,slug)'

    if (body.action === 'pricing') return json({ pricing })

    if (body.action === 'cart-prices') {
      const productIds = Array.isArray(body.productIds)
        ? body.productIds.filter((id): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)).slice(0, 100)
        : []
      const variationIds = Array.isArray(body.variationIds)
        ? body.variationIds.filter((id): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)).slice(0, 300)
        : []
      if (!productIds.length) return json({ items: [], pricing })

      const { data: cartProducts, error: cartProductsError } = await admin
        .from('products')
        .select(productSelect)
        .in('id', productIds)
        .eq('is_active', true)
      if (cartProductsError) throw cartProductsError

      const variationMap = new Map<string, ReturnType<typeof publicVariation>>()
      if (variationIds.length) {
        const { data: cartVariations, error: cartVariationsError } = await admin
          .from('product_variations')
          .select('*')
          .in('id', variationIds)
          .eq('is_active', true)
        if (cartVariationsError) throw cartVariationsError
        for (const variation of cartVariations ?? []) {
          variationMap.set(variation.id, publicVariation(variation as Record<string, unknown>, pricing))
        }
      }

      return json({
        items: (cartProducts ?? []).map((row) => {
          const product = publicProduct(row as Record<string, unknown>, pricing)
          return product ? { productId: row.id, product, variations: Array.from(variationMap.values()).filter((variation) => variation.product_id === row.id) } : null
        }).filter(Boolean),
        pricing,
      })
    }

    if (body.action === 'catalog' || !body.action) {
      const { data, error } = await admin.from('products').select(productSelect).eq('is_active', true).order('created_at', { ascending: false }).limit(1000)
      if (error) throw error
      const products = (data ?? []).map((row) => publicProduct(row as Record<string, unknown>, pricing)).filter(Boolean)
      return json({ products, pricing })
    }

    if (body.action === 'favorites') {
      const ids = Array.isArray(body.productIds) ? body.productIds.filter((id): id is string => typeof id === 'string').slice(0, 100) : []
      if (!ids.length) return json({ products: [], pricing })
      const { data, error } = await admin.from('products').select(productSelect).in('id', ids).eq('is_active', true)
      if (error) throw error
      return json({ products: (data ?? []).map((row) => publicProduct(row as Record<string, unknown>, pricing)).filter(Boolean), pricing })
    }

    if (body.action === 'product') {
      if (typeof body.slug !== 'string' || body.slug.length < 1 || body.slug.length > 255) return json({ error: 'Invalid product slug' }, 400)
      const { data: row, error } = await admin.from('products').select(productSelect).eq('slug', body.slug).eq('is_active', true).maybeSingle()
      if (error) throw error
      if (!row) return json({ error: 'Product not found' }, 404)
      const product = publicProduct(row as Record<string, unknown>, pricing)
      if (!product) return json({ error: 'Product is not available in this region' }, 404)

      const { data: variationRows, error: variationError } = await admin.from('product_variations').select('*').eq('product_id', row.id).eq('is_active', true)
      if (variationError) throw variationError
      const { data: materials, error: materialError } = await admin.from('product_materials').select('*, materials(name_en,name_es)').eq('product_id', row.id)
      if (materialError) throw materialError
      const { data: relatedRows, error: relatedError } = await admin.from('products').select(productSelect).eq('is_active', true).eq('category_id', row.category_id).neq('id', row.id).limit(4)
      if (relatedError) throw relatedError
      const relatedProducts = (relatedRows ?? []).map((item) => publicProduct(item as Record<string, unknown>, pricing)).filter(Boolean)
      return json({ product, variations: (variationRows ?? []).map((item) => publicVariation(item as Record<string, unknown>, pricing)), materials: materials ?? [], relatedProducts, pricing })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (error) {
    console.error('Storefront pricing failed', error)
    return json({ error: 'Could not load storefront pricing' }, 500)
  }
})
