import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const normalizePhone = (phone: string) => phone.replace(/\D/g, '')

const itemLines = (items: any[]) => items.map((item) => {
  const variations = Array.isArray(item.selected_variations)
    ? item.selected_variations.map((variation: any) => variation.name).filter(Boolean).join(', ')
    : ''
  const name = item.products?.name_es || item.products?.name_en || 'Producto'
  return `- ${item.quantity} x ${name}${variations ? ` (${variations})` : ''} - $${(Number(item.unit_price) * item.quantity).toFixed(2)}`
})

const whatsappMessage = (order: any, items: any[]) => {
  const shipping = order.shipping_address || {}
  return [
    `Hola ${shipping.full_name || 'cliente'}, hemos recibido tu pedido:`, '',
    ...itemLines(items), '',
    `Total estimado: $${Number(order.total).toFixed(2)}`, '',
    'Continuamos con el pedido?', '', "APERFY | Andres' Perfect Finds",
  ].join('\n')
}

const telegramMessage = (order: any, items: any[]) => {
  const shipping = order.shipping_address || {}
  return [
    'NUEVO PEDIDO APERFY', '',
    `Orden: #${String(order.id).slice(0, 8).toUpperCase()}`,
    `Cliente: ${shipping.full_name || 'Sin nombre'}`,
    `Telefono: ${shipping.phone || 'Sin telefono'}`,
    `Email: ${shipping.email || 'Sin email'}`, '',
    ...itemLines(items), '',
    `Total estimado: $${Number(order.total).toFixed(2)}`,
    shipping.address ? `Direccion: ${shipping.address}, ${shipping.city || ''}` : '',
    order.notes ? `Notas: ${order.notes}` : '', '',
    'Estado: Pendiente de confirmacion por WhatsApp',
  ].filter(Boolean).join('\n')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const telegramToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const telegramChatId = Deno.env.get('TELEGRAM_CHAT_ID')
  const whatsappNumber = normalizePhone(Deno.env.get('WHATSAPP_BUSINESS_NUMBER') || '')
  const authorization = req.headers.get('Authorization')

  if (!supabaseUrl || !serviceRoleKey || !anonKey || !telegramToken || !telegramChatId || !whatsappNumber) {
    return json({ error: 'Server notification configuration is incomplete' }, 500)
  }
  if (!authorization) return json({ error: 'Authentication required' }, 401)

  let orderId = ''
  try { orderId = String((await req.json()).orderId || '') } catch { return json({ error: 'Invalid JSON' }, 400) }
  if (!orderId) return json({ error: 'orderId is required' }, 400)

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) return json({ error: 'Authentication required' }, 401)

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const { data: order, error: orderError } = await adminClient.from('orders').select('*').eq('id', orderId).maybeSingle()
  if (orderError) return json({ error: orderError.message }, 500)
  if (!order) return json({ error: 'Order not found' }, 404)

  const { data: role } = await adminClient.from('user_roles').select('role').eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle()
  if (order.user_id !== userData.user.id && !role) return json({ error: 'Not allowed' }, 403)
  if (order.telegram_status === 'sent') return json({ ok: true, telegramStatus: 'sent', duplicate: true })

  await adminClient.from('orders').update({ telegram_status: 'sending', telegram_error: null }).eq('id', orderId)
  const { data: items, error: itemsError } = await adminClient
    .from('order_items')
    .select('quantity, unit_price, selected_variations, products(name_es, name_en)')
    .eq('order_id', orderId)
  if (itemsError) return json({ error: itemsError.message }, 500)

  const waMessage = whatsappMessage(order, items || [])
  const waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(waMessage)}`
  const telegramResponse = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: telegramChatId,
      text: telegramMessage(order, items || []),
      reply_markup: { inline_keyboard: [[{ text: 'Contactar por WhatsApp', url: waUrl }]] },
    }),
  })

  if (!telegramResponse.ok) {
    const errorText = await telegramResponse.text()
    await adminClient.from('orders').update({ telegram_status: 'failed', telegram_error: errorText.slice(0, 500) }).eq('id', orderId)
    return json({ ok: false, telegramStatus: 'failed', whatsappUrl: waUrl })
  }

  const telegramResult = await telegramResponse.json()
  await adminClient.from('orders').update({ telegram_status: 'sent', telegram_message_id: telegramResult.result?.message_id || null, telegram_error: null }).eq('id', orderId)
  return json({ ok: true, telegramStatus: 'sent', whatsappUrl: waUrl })
})
