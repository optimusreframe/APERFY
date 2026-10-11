import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type PricingRegion = 'USA' | 'VENEZUELA'
type PricingMode = 'global' | 'geo'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

function getRegion(req: Request): PricingRegion {
  const country = req.headers.get('cf-ipcountry')
  const normalizedCountry = country && /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : null
  return normalizedCountry === 'US' ? 'USA' : 'VENEZUELA'
}

async function requireUser(req: Request, admin: SupabaseClient) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  const { data, error } = await admin.auth.getUser(token)
  return error || !data.user ? null : data.user
}

async function getPricing(admin: SupabaseClient, req: Request) {
  const region = getRegion(req)
  const { data: modeSetting } = await admin.from('admin_settings').select('setting_value').eq('setting_key', 'regional_pricing_mode').maybeSingle()
  const mode: PricingMode = modeSetting?.setting_value === 'global' ? 'global' : 'geo'
  const { data: rate } = await admin.from('currency_rates').select('rate').eq('base_currency', 'USD').eq('quote_currency', 'VES').eq('is_active', true).maybeSingle()
  return { region, mode, bcvRate: rate?.rate ? Number(rate.rate) : null }
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function cleanItems(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) throw new Error('Invalid cart')
  return value.map((raw) => {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid cart item')
    const item = raw as Record<string, unknown>
    const productId = typeof item.productId === 'string' ? item.productId : ''
    const quantity = Number(item.quantity)
    if (!productId || !/^[0-9a-f-]{36}$/i.test(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw new Error('Invalid cart item')
    const variations = Array.isArray(item.selectedVariations) ? item.selectedVariations.slice(0, 20).flatMap((variation) => {
      if (!variation || typeof variation !== 'object') return []
      const row = variation as Record<string, unknown>
      return typeof row.id === 'string' && /^[0-9a-f-]{36}$/i.test(row.id) ? [{ id: row.id }] : []
    }) : []
    return {
      productId,
      quantity,
      variations,
      notes: typeof item.notes === 'string' ? item.notes.slice(0, 500) : null,
      weightGrams: numberOrNull(item.weightGrams),
    }
  })
}

function cleanAddress(form: unknown) {
  if (!form || typeof form !== 'object') throw new Error('Shipping information is required')
  const value = form as Record<string, unknown>
  const get = (key: string, max = 255) => typeof value[key] === 'string' ? value[key].trim().slice(0, max) : ''
  const result = {
    full_name: get('fullName', 100), email: get('email', 255), phone: get('phone', 80),
    address: get('address'), address2: get('address2'), city: get('city', 100),
    state: get('state', 100), zip_code: get('zipCode', 30), country: get('country', 100),
    notes: get('notes', 500),
  }
  if (!result.full_name || !result.email || !result.phone || !result.address || !result.city || !result.state || !result.country) throw new Error('Incomplete shipping information')
  return result
}

function resolveProductPrice(product: Record<string, unknown>, pricing: { region: PricingRegion; mode: PricingMode }) {
  if (pricing.mode === 'geo' && pricing.region === 'VENEZUELA') {
    const value = numberOrNull(product.venezuela_price_usd)
    if (value === null || value < 0) throw new Error('Product is not configured for Venezuela')
    return value
  }
  const value = numberOrNull(product.base_price)
  if (value === null || value < 0) throw new Error('Product has an invalid price')
  return value
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Server configuration error' }, 500)
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const user = await requireUser(req, admin)
  if (!user) return json({ error: 'Authentication required' }, 401)

  try {
    const body = await req.json() as Record<string, unknown>
    const items = cleanItems(body.items)
    const form = cleanAddress(body.form)
    const paymentMethod = typeof body.paymentMethod === 'string' ? body.paymentMethod.trim().slice(0, 80) : ''
    if (!paymentMethod || !/^[a-z0-9_-]+$/i.test(paymentMethod)) return json({ error: 'Invalid payment method' }, 400)

    const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim().slice(0, 100) : ''
    if (!idempotencyKey) return json({ error: 'Idempotency key is required' }, 400)
    const { data: existing } = await admin.from('orders').select('id,total').eq('user_id', user.id).eq('idempotency_key', idempotencyKey).maybeSingle()
    if (existing) return json({ ok: true, orderId: existing.id, total: Number(existing.total), reused: true })

    const pricing = await getPricing(admin, req)
    const productIds = [...new Set(items.map((item) => item.productId))]
    const { data: products, error: productsError } = await admin.from('products').select('id,base_price,venezuela_price_usd,is_active,inventory_enabled,stock_quantity').in('id', productIds)
    if (productsError) throw productsError
    const productMap = new Map((products ?? []).map((product) => [product.id, product as Record<string, unknown>]))
    if (productMap.size !== productIds.length) throw new Error('One or more products are unavailable')

    const variationIds = [...new Set(items.flatMap((item) => item.variations.map((variation) => variation.id)))]
    const variationMap = new Map<string, Record<string, unknown>>()
    if (variationIds.length) {
      const { data: variations, error: variationError } = await admin.from('product_variations').select('id,product_id,type,price_modifier,price_override,price_override_venezuela,use_manual_price,is_active,weight_grams').in('id', variationIds)
      if (variationError) throw variationError
      for (const variation of variations ?? []) variationMap.set(variation.id, variation as Record<string, unknown>)
    }

    let subtotal = 0
    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId)!
      if (!product.is_active) throw new Error('One or more products are no longer available')
      if (product.inventory_enabled && item.quantity > Number(product.stock_quantity)) throw new Error('Insufficient stock')
      let computedPrice = resolveProductPrice(product, pricing)
      let manualSizePrice: number | null = null
      const selectedVariations = item.variations.map((selected) => {
        const variation = variationMap.get(selected.id)
        if (!variation || !variation.is_active || variation.product_id !== item.productId) throw new Error('A selected variation is unavailable')
        if (variation.type === 'size' && variation.use_manual_price) {
          const override = pricing.mode === 'geo' && pricing.region === 'VENEZUELA' ? variation.price_override_venezuela : variation.price_override
          if (override !== null && override !== undefined) manualSizePrice = Number(override)
          else if (!(pricing.mode === 'geo' && pricing.region === 'VENEZUELA')) computedPrice += Number(variation.price_modifier || 0)
        } else {
          computedPrice += Number(variation.price_modifier || 0)
        }
        return { id: selected.id }
      })
      const unitPrice = Math.max(0, manualSizePrice ?? computedPrice)
      subtotal += unitPrice * item.quantity
      return { product_id: item.productId, quantity: item.quantity, unit_price: unitPrice, selected_variations: selectedVariations, notes: item.notes }
    })

    const shippingProviderId = typeof body.selectedShipping === 'string' ? body.selectedShipping : null
    let shippingCost = 0
    if (shippingProviderId) {
      const { data: shippingProvider, error: shippingError } = await admin.from('shipping_providers').select('id,base_rate,per_kg_rate,is_active').eq('id', shippingProviderId).maybeSingle()
      if (shippingError) throw shippingError
      if (!shippingProvider?.is_active) throw new Error('Shipping method is unavailable')
      const totalWeightKg = items.reduce((sum, item) => sum + (item.quantity * Math.max(0, item.weightGrams || 100)) / 1000, 0)
      shippingCost = Number(shippingProvider.base_rate) + totalWeightKg * Number(shippingProvider.per_kg_rate)
    }

    const discountId = typeof body.discountId === 'string' ? body.discountId : null
    let discountAmount = 0
    if (discountId && /^[0-9a-f-]{36}$/i.test(discountId)) {
      const { data: discount } = await admin.from('discount_codes').select('id,discount_type,discount_value,min_purchase,max_uses,current_uses,starts_at,expires_at,is_active').eq('id', discountId).maybeSingle()
      const now = Date.now()
      if (discount && discount.is_active && (!discount.starts_at || Date.parse(discount.starts_at) <= now) && (!discount.expires_at || Date.parse(discount.expires_at) >= now) && (!discount.max_uses || discount.current_uses < discount.max_uses) && subtotal >= Number(discount.min_purchase || 0)) {
        discountAmount = discount.discount_type === 'percentage' ? subtotal * Number(discount.discount_value) / 100 : Number(discount.discount_value)
        discountAmount = Math.min(Math.max(0, discountAmount), subtotal)
      }
    }

    const shippingAddress = {
      ...form,
      language: body.language === 'en' ? 'en' : 'es',
      country_code: typeof body.countryCode === 'string' ? body.countryCode.slice(0, 2).toUpperCase() : '',
      phone_country_code: typeof body.phoneCountryCode === 'string' ? body.phoneCountryCode.slice(0, 2).toUpperCase() : '',
      state_code: typeof body.stateCode === 'string' ? body.stateCode.slice(0, 10) : '',
    }
    const { data: order, error: orderError } = await admin.from('orders').insert({
      user_id: user.id,
      total: Math.max(0, subtotal + shippingCost - discountAmount),
      notes: form.notes || null,
      payment_method: paymentMethod,
      source: paymentMethod === 'whatsapp' || paymentMethod === 'telegram' ? paymentMethod : 'website',
      idempotency_key: idempotencyKey,
      shipping_address: shippingAddress,
      shipping_provider_id: shippingProviderId,
      shipping_cost: shippingCost,
      discount_code_id: discountId,
      discount_amount: discountAmount,
      pricing_region: pricing.region,
      pricing_mode: pricing.mode,
      pricing_currency: 'USD',
      exchange_rate_ves_per_usd: pricing.bcvRate,
    }).select('id,total').single()
    if (orderError) throw orderError

    const { error: itemsError } = await admin.from('order_items').insert(orderItems.map((item) => ({ ...item, order_id: order.id })))
    if (itemsError) {
      await admin.from('orders').update({ status: 'cancelled' }).eq('id', order.id).eq('status', 'pending')
      throw itemsError
    }

    const { data: stockResult, error: stockError } = await admin.rpc('reserve_stock_for_order_internal', { p_order_id: order.id })
    if (stockError || !(stockResult && typeof stockResult === 'object' && 'ok' in stockResult && stockResult.ok === true)) {
      await admin.from('orders').update({ status: 'cancelled' }).eq('id', order.id).eq('status', 'pending')
      if (stockError) throw stockError
      throw new Error('Insufficient stock')
    }
    if (discountId && discountAmount > 0) await admin.rpc('increment_discount_usage', { _id: discountId })
    await admin.rpc('mark_abandoned_cart_converted', { p_order_id: order.id })

    const { data: savedOrder } = await admin.from('orders').select('id,total').eq('id', order.id).maybeSingle()
    return json({ ok: true, orderId: order.id, total: Number(savedOrder?.total ?? order.total), pricing: { region: pricing.region, mode: pricing.mode, currency: 'USD', bcvRate: pricing.bcvRate } })
  } catch (error) {
    console.error('Regional order creation failed', error)
    return json({ error: error instanceof Error ? error.message : 'Could not create order' }, 400)
  }
})
