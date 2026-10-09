import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildIncomingOrderMessages, buildTelegramCheckoutUrl } from '../../../src/lib/incomingOrder.ts'
import { getIntegrationSecret } from '../_shared/integration-secrets.ts'
import { getNotificationTemplate, renderNotificationTemplate } from '../_shared/notification-templates.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const ADMIN_ORDERS_URL = 'https://aperfy.kpwr.dev/admin/orders'

type Variation = { name?: unknown }
type ProductReference = { name_es?: string | null; name_en?: string | null } | null
type OrderItem = {
  quantity: number
  unit_price: number
  selected_variations: unknown
  products: ProductReference
}
type ShippingAddress = Record<string, unknown>
type OrderData = {
  id: string
  total: number
  shipping_address: unknown
  notes: string | null
  user_id: string
  telegram_status: string | null
  payment_method: string | null
  payment_status?: string | null
}
type CheckoutChannel = 'whatsapp' | 'telegram'

const itemLines = (items: OrderItem[]) => items.map((item) => {
  const variations = Array.isArray(item.selected_variations)
    ? item.selected_variations
      .filter((variation): variation is Variation => Boolean(variation && typeof variation === 'object'))
      .map((variation) => typeof variation.name === 'string' ? variation.name : '')
      .filter(Boolean).join(', ')
    : ''
  const name = item.products?.name_es || item.products?.name_en || 'Producto'
  return `- ${item.quantity} x ${name}${variations ? ` (${variations})` : ''} - $${(Number(item.unit_price) * item.quantity).toFixed(2)}`
})

const telegramMessage = (order: OrderData, items: OrderItem[], channel: CheckoutChannel) => {
  const shipping = order.shipping_address && typeof order.shipping_address === 'object' ? order.shipping_address as ShippingAddress : {}
  const english = shipping.language === 'en'
  const address = [shipping.address, shipping.address2, shipping.city, shipping.state, shipping.zip_code, shipping.country]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(', ')
  return [
    english ? 'NEW APERFY ORDER' : 'NUEVO PEDIDO APERFY', '',
    `${english ? 'Order' : 'Orden'}: #${String(order.id).slice(0, 8).toUpperCase()}`,
    `${english ? 'Customer' : 'Cliente'}: ${shipping.full_name || (english ? 'No name' : 'Sin nombre')}`,
    `${english ? 'Phone' : 'Teléfono'}: ${shipping.phone || (english ? 'Not provided' : 'Sin teléfono')}`,
    `Email: ${shipping.email || (english ? 'Not provided' : 'Sin email')}`,
    address ? `${english ? 'Address' : 'Dirección'}: ${address}` : '', '',
    ...itemLines(items), '',
    `${english ? 'Estimated total' : 'Total estimado'}: $${Number(order.total).toFixed(2)}`,
    order.notes ? `${english ? 'Notes' : 'Notas'}: ${order.notes}` : '', '',
    english
      ? `Status: Pending ${channel === 'telegram' ? 'Telegram' : 'WhatsApp'} confirmation`
      : `Estado: Pendiente de confirmación por ${channel === 'telegram' ? 'Telegram' : 'WhatsApp'}`,
  ].filter(Boolean).join('\n')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const authorization = req.headers.get('Authorization')

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json({ error: 'Server notification configuration is incomplete' }, 500)
  }
  if (!authorization) return json({ error: 'Authentication required' }, 401)

  let orderId = ''
  let channel: CheckoutChannel = 'whatsapp'
  try {
    const body = await req.json() as { orderId?: unknown; channel?: unknown }
    orderId = String(body.orderId || '')
    channel = body.channel === 'telegram' ? 'telegram' : 'whatsapp'
  } catch { return json({ error: 'Invalid JSON' }, 400) }
  if (!orderId) return json({ error: 'orderId is required' }, 400)

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) return json({ error: 'Authentication required' }, 401)

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const telegramToken = await getIntegrationSecret(adminClient, 'TELEGRAM_BOT_TOKEN')
  const telegramChatId = await getIntegrationSecret(adminClient, 'TELEGRAM_CHAT_ID')
  const whatsappNumber = await getIntegrationSecret(adminClient, 'WHATSAPP_BUSINESS_NUMBER')
  const telegramCheckoutTarget = await getIntegrationSecret(adminClient, 'TELEGRAM_CHECKOUT_TARGET')

  const { data: order, error: orderError } = await adminClient.from('orders').select('*').eq('id', orderId).maybeSingle()
  if (orderError) return json({ error: orderError.message }, 500)
  if (!order) return json({ error: 'Order not found' }, 404)

  const { data: role } = await adminClient.from('user_roles').select('role').eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle()
  if (order.user_id !== userData.user.id && !role) return json({ error: 'Not allowed' }, 403)
  const { data: items, error: itemsError } = await adminClient
    .from('order_items')
    .select('quantity, unit_price, selected_variations, products(name_es, name_en)')
    .eq('order_id', orderId)
  if (itemsError) return json({ error: itemsError.message }, 500)

  const orderData = order as OrderData
  const orderItems = (items || []) as OrderItem[]
  const shipping = orderData.shipping_address && typeof orderData.shipping_address === 'object' ? orderData.shipping_address as ShippingAddress : {}
  const locale = shipping.language === 'en' ? 'en' : 'es'
  const shippingAddress = [shipping.address, shipping.address2, shipping.city, shipping.state, shipping.zip_code, shipping.country]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(', ')
  const paymentMethods: Record<string, string> = {
    whatsapp: 'WhatsApp',
    zelle: 'Zelle',
    cashapp: 'Cash App',
    binance: 'Binance Pay',
  }
  const paymentMethod = typeof orderData.payment_method === 'string'
    ? paymentMethods[orderData.payment_method.toLowerCase()] || orderData.payment_method
    : undefined
  const messages = buildIncomingOrderMessages({
    orderCode: String(orderData.id).slice(0, 8).toUpperCase(),
    customerName: typeof shipping.full_name === 'string' ? shipping.full_name : '',
    phone: typeof shipping.phone === 'string' ? shipping.phone : '',
    email: typeof shipping.email === 'string' ? shipping.email : '',
    items: orderItems.map((item) => {
      const variations = Array.isArray(item.selected_variations)
        ? item.selected_variations
          .filter((variation): variation is Variation => Boolean(variation && typeof variation === 'object'))
          .map((variation) => typeof variation.name === 'string' ? variation.name : '')
          .filter(Boolean)
          .join(', ')
        : ''
      const name = locale === 'es'
        ? item.products?.name_es || item.products?.name_en || 'Producto'
        : item.products?.name_en || item.products?.name_es || 'Product'
      return {
        name,
        quantity: item.quantity,
        total: Number(item.unit_price) * item.quantity,
        variation: variations,
      }
    }),
    total: Number(orderData.total),
    language: locale,
    whatsappNumber: whatsappNumber || undefined,
    accountUrl: 'https://aperfy.kpwr.dev/orders',
    shipping: shippingAddress,
    notes: orderData.notes || undefined,
    paymentMethod,
    paymentState: orderData.payment_status || 'pending',
  })
  const waUrl = messages.whatsappUrl
  const telegramUrl = buildTelegramCheckoutUrl(telegramCheckoutTarget || undefined, messages.whatsappMessage, orderId)
  const templateData = {
    order_code: String(order.id).slice(0, 8).toUpperCase(),
    customer_name: shipping.full_name || '',
    phone: shipping.phone || '',
    email: shipping.email || '',
    shipping_address: shippingAddress,
    items_summary: itemLines(orderItems).join('\n'),
    total: `$${Number(order.total).toFixed(2)}`,
    payment_method: paymentMethod || '',
    payment_state: orderData.payment_status || 'pending',
  }
  const telegramTemplate = await getNotificationTemplate(adminClient, 'order.new', 'telegram', locale)
  const customerWhatsAppTemplate = await getNotificationTemplate(adminClient, 'order.received', 'whatsapp', locale)
  const customerNumber = messages.phone
  const customerMessage = customerWhatsAppTemplate
    ? renderNotificationTemplate(customerWhatsAppTemplate.body_text, templateData)
    : messages.customerWhatsAppMessage
  const customerWaUrl = customerNumber
    ? `https://wa.me/${customerNumber}?text=${encodeURIComponent(customerMessage)}`
    : null
  const english = shipping.language === 'en'
  if (order.telegram_status === 'sent') {
    return json({
      ok: true,
      telegramStatus: 'sent',
      duplicate: true,
      channel,
      whatsappUrl: waUrl,
      telegramUrl,
      handoffUrl: channel === 'telegram' ? telegramUrl : waUrl,
    })
  }
  if (!telegramToken || !telegramChatId) {
    await adminClient.from('orders').update({ telegram_status: 'failed', telegram_error: 'Telegram notification is not configured' }).eq('id', orderId)
    return json({
      ok: false,
      telegramStatus: 'failed',
      channel,
      whatsappUrl: waUrl,
      telegramUrl,
      handoffUrl: channel === 'telegram' ? telegramUrl : waUrl,
    })
  }

  await adminClient.from('orders').update({ telegram_status: 'sending', telegram_error: null }).eq('id', orderId)
  const telegramResponse = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: telegramChatId,
      text: telegramTemplate
        ? renderNotificationTemplate(telegramTemplate.body_text, templateData)
        : telegramMessage(orderData, orderItems, channel),
      reply_markup: { inline_keyboard: [[
        ...(customerWaUrl ? [{ text: english ? 'Contact customer on WhatsApp' : 'Contactar cliente por WhatsApp', url: customerWaUrl }] : []),
        { text: english ? 'Open admin orders' : 'Abrir pedidos en admin', url: `${ADMIN_ORDERS_URL}?order=${encodeURIComponent(orderId)}` },
      ]] },
    }),
  })

  if (!telegramResponse.ok) {
    const errorText = await telegramResponse.text()
    await adminClient.from('orders').update({ telegram_status: 'failed', telegram_error: errorText.slice(0, 500) }).eq('id', orderId)
    return json({
      ok: false,
      telegramStatus: 'failed',
      channel,
      whatsappUrl: waUrl,
      telegramUrl,
      handoffUrl: channel === 'telegram' ? telegramUrl : waUrl,
    })
  }

  const telegramResult = await telegramResponse.json()
  await adminClient.from('orders').update({ telegram_status: 'sent', telegram_message_id: telegramResult.result?.message_id || null, telegram_error: null }).eq('id', orderId)
  return json({
    ok: true,
    telegramStatus: 'sent',
    channel,
    whatsappUrl: waUrl,
    telegramUrl,
    handoffUrl: channel === 'telegram' ? telegramUrl : waUrl,
  })
})
