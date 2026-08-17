import { createClient } from 'npm:@supabase/supabase-js@2'
import { getIntegrationSecret } from '../_shared/integration-secrets.ts'

const corsHeaders = { 'Content-Type': 'application/json' }
type SuppressionReason = 'bounce' | 'complaint'

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders })
}

function toBytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

async function verifyResendWebhook(req: Request, body: string, secret: string) {
  const id = req.headers.get('svix-id')
  const timestamp = req.headers.get('svix-timestamp')
  const signature = req.headers.get('svix-signature')
  if (!id || !timestamp || !signature) return false
  const timestampNumber = Number(timestamp)
  if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() / 1000 - timestampNumber) > 300) return false

  const rawSecret = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret
  const key = await crypto.subtle.importKey('raw', toBytes(rawSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${timestamp}.${body}`))
  const expected = btoa(String.fromCharCode(...new Uint8Array(digest)))
  return signature.split(' ').some((value) => value === `v1,${expected}`)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: 'Server configuration error' }, 500)
  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const webhookSecret = await getIntegrationSecret(supabase, 'RESEND_WEBHOOK_SECRET')
  if (!webhookSecret) return jsonResponse({ error: 'RESEND_WEBHOOK_SECRET is not configured' }, 503)

  const body = await req.text()
  if (!(await verifyResendWebhook(req, body, webhookSecret))) return jsonResponse({ error: 'Invalid signature' }, 401)

  const event = JSON.parse(body) as { type?: string; data?: { to?: string[] | string; email_id?: string; metadata?: Record<string, unknown> } }
  const reason: SuppressionReason | null = event.type === 'email.bounced' ? 'bounce' : event.type === 'email.complained' ? 'complaint' : null
  if (!reason) return jsonResponse({ success: true, ignored: true })

  const recipients = Array.isArray(event.data?.to) ? event.data.to : event.data?.to ? [event.data.to] : []
  for (const recipient of recipients) {
    const email = recipient.trim().toLowerCase()
    if (!email || !email.includes('@')) continue
    const { error } = await supabase.from('suppressed_emails').upsert({
      email,
      reason,
      metadata: event.data?.metadata ?? null,
    }, { onConflict: 'email' })
    if (error) throw error
    await supabase.from('email_send_log').insert({
      message_id: event.data?.email_id ?? null,
      template_name: 'resend-webhook',
      recipient_email: email,
      status: reason === 'bounce' ? 'bounced' : 'complained',
      error_message: reason === 'bounce' ? 'Resend reported a bounce' : 'Resend reported a complaint',
    })
  }

  return jsonResponse({ success: true, processed: recipients.length })
})
