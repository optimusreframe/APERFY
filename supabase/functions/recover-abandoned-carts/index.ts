import { createClient } from 'npm:@supabase/supabase-js@2'
import { getIntegrationSecret } from '../_shared/integration-secrets.ts'

const MAX_BATCH = 25
const MIN_AGE_MS = 2 * 60 * 60 * 1000

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

function validCronRequest(req: Request, cronSecret: string | null): boolean {
  return Boolean(cronSecret && req.headers.get('x-cron-secret') === cronSecret)
}

function formatItems(value: unknown): string {
  if (!Array.isArray(value)) return ''
  return value.slice(0, 20).flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    const name = typeof row.productName === 'string' ? row.productName.trim() : ''
    const quantity = Number.isInteger(row.quantity) ? row.quantity : 0
    if (!name || quantity < 1) return []
    return [`• ${quantity} × ${name}`]
  }).join('\n')
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Server configuration error' }, 500)

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const cronSecret = await getIntegrationSecret(admin, 'EMAIL_QUEUE_CRON_SECRET')
  if (!validCronRequest(req, cronSecret)) return json({ error: 'Forbidden' }, 403)

  const cutoff = new Date(Date.now() - MIN_AGE_MS).toISOString()
  const { data: carts, error } = await admin
    .from('abandoned_carts')
    .select('id, user_id, items, subtotal, locale, last_activity_at')
    .is('recovery_sent_at', null)
    .is('converted_order_id', null)
    .lt('last_activity_at', cutoff)
    .order('last_activity_at', { ascending: true })
    .limit(MAX_BATCH)
  if (error) return json({ error: 'Could not read abandoned carts' }, 500)

  let queued = 0
  let skipped = 0
  for (const cart of carts ?? []) {
    const { data: authUser } = await admin.auth.admin.getUserById(cart.user_id)
    const email = authUser.user?.email?.trim().toLowerCase()
    const { data: profile } = await admin.from('profiles').select('full_name').eq('id', cart.user_id).maybeSingle()
    if (!email) {
      await admin.from('abandoned_carts').update({ recovery_sent_at: new Date().toISOString() }).eq('id', cart.id)
      skipped += 1
      continue
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        templateName: 'cart-recovery',
        recipientEmail: email,
        idempotencyKey: `cart-recovery-${cart.id}`,
        templateData: {
          customer_name: profile?.full_name || '',
          customerName: profile?.full_name || '',
          cart_url: 'https://aperfy.kpwr.dev/cart',
          cartUrl: 'https://aperfy.kpwr.dev/cart',
          items_summary: formatItems(cart.items),
          itemsSummary: formatItems(cart.items),
          subtotal: `$${Number(cart.subtotal || 0).toFixed(2)}`,
          language: cart.locale === 'en' ? 'en' : 'es',
        },
      }),
    })

    if (!response.ok) {
      console.warn('Cart recovery email was not queued', { cartId: cart.id, status: response.status })
      continue
    }
    await admin.from('abandoned_carts').update({ recovery_sent_at: new Date().toISOString() }).eq('id', cart.id)
    queued += 1
  }

  return json({ ok: true, inspected: carts?.length || 0, queued, skipped })
})
