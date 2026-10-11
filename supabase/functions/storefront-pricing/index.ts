import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const BCV_URL = 'https://www.bcv.org.ve/'
const BCV_MIRROR_URL = 'https://bcv.today/api/v1/rate.json'
const RATE_REFRESH_MS = 60 * 60 * 1000

type PricingRegion = 'USA' | 'VENEZUELA'
type PricingMode = 'global' | 'geo'

type Pricing = {
  region: PricingRegion
  mode: PricingMode
  currency: 'USD'
  bcvRate: number | null
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
  try {
    const response = await fetch(BCV_URL, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-VE,es;q=0.9,en;q=0.7',
        'User-Agent': 'Mozilla/5.0 (compatible; APERFY/1.0; +https://aperfy.kpwr.dev)',
      },
    })
    if (!response.ok) throw new Error(`BCV returned ${response.status}`)
    return parseBcvRate(await response.text())
  } catch (primaryError) {
    console.warn('Direct BCV page unavailable; trying the official-rate mirror', primaryError)
    const mirrorResponse = await fetch(BCV_MIRROR_URL, { headers: { Accept: 'application/json' } })
    if (!mirrorResponse.ok) throw primaryError
    const mirrorPayload = await mirrorResponse.json() as { USD?: unknown }
    const rate = Number(mirrorPayload.USD)
    if (!Number.isFinite(rate) || rate <= 0) throw primaryError
    return rate
  }
}

async function getMode(admin: SupabaseClient): Promise<PricingMode> {
  const { data } = await admin.from('admin_settings').select('setting_value').eq('setting_key', 'regional_pricing_mode').maybeSingle()
  return data?.setting_value === 'global' ? 'global' : 'geo'
}

async function getRate(admin: SupabaseClient, refresh = false): Promise<number | null> {
  const { data: current } = await admin.from('currency_rates').select('*').eq('base_currency', 'USD').eq('quote_currency', 'VES').eq('is_active', true).maybeSingle()
  const fetchedAt = current?.fetched_at ? Date.parse(current.fetched_at) : 0
  if (!refresh && current?.source === 'manual' && current?.rate) return Number(current.rate)
  if (!refresh && current?.rate && fetchedAt && Date.now() - fetchedAt < RATE_REFRESH_MS) return Number(current.rate)

  try {
    const rate = await fetchBcvRate()
    const { error } = await admin.from('currency_rates').upsert({
      base_currency: 'USD', quote_currency: 'VES', rate,
      source: 'bcv', is_automatic: true, is_active: true,
      source_url: BCV_URL, fetched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'base_currency,quote_currency' })
    if (error) throw error
    return rate
  } catch (error) {
    console.warn('Could not refresh BCV rate; using the last saved rate', error)
    return current?.rate ? Number(current.rate) : null
  }
}

function publicProduct(row: Record<string, unknown>, pricing: Pricing) {
  const category = row.categories && typeof row.categories === 'object' ? row.categories : null
  const rawVenezuelaPrice = row.venezuela_price_usd == null ? null : Number(row.venezuela_price_usd)
  const effectivePrice = pricing.mode === 'geo' && pricing.region === 'VENEZUELA'
    ? rawVenezuelaPrice
    : Number(row.base_price)
  if (!Number.isFinite(effectivePrice) || effectivePrice === null || effectivePrice < 0) return null
  if (pricing.mode === 'geo' && pricing.region === 'VENEZUELA' && rawVenezuelaPrice === null) return null

  return {
    id: row.id,
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
    }

    if (body.action === 'refresh-rate') {
      const user = await requireAdmin(req, admin)
      if (!user) return json({ error: 'Admin access required' }, 403)
      const manualRate = Number(body.rate)
      const rate = Number.isFinite(manualRate) && manualRate > 0 ? manualRate : await getRate(admin, true)
      if (!rate) return json({ error: 'BCV rate is unavailable' }, 503)
      if (Number.isFinite(manualRate) && manualRate > 0) {
        const { error } = await admin.from('currency_rates').upsert({
          base_currency: 'USD', quote_currency: 'VES', rate: manualRate,
          source: 'manual', is_automatic: false, is_active: true,
          updated_by: user.id, updated_at: new Date().toISOString(),
        }, { onConflict: 'base_currency,quote_currency' })
        if (error) throw error
      }
      return json({ ok: true, rate })
    }

    const region = getRegion(req)
    const mode = await getMode(admin)
    const bcvRate = region === 'VENEZUELA' ? await getRate(admin, Boolean(body.refresh)) : null
    const pricing: Pricing = { region, mode, currency: 'USD', bcvRate }
    const productSelect = 'id,name_en,name_es,description_en,description_es,slug,base_price,venezuela_price_usd,category_id,is_active,is_featured,images,created_at,updated_at,seller_name,return_policy_en,return_policy_es,return_window_days,condition_status,model_3d_url,inventory_enabled,stock_quantity,low_stock_threshold,inventory_source_key,categories(id,name_en,name_es,slug)'

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
