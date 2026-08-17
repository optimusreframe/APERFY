import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export const INTEGRATION_SECRET_NAMES = [
  'AI_PROVIDER_API_KEY',
  'AI_PROVIDER_BASE_URL',
  'FIRECRAWL_API_KEY',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'WHATSAPP_BUSINESS_NUMBER',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'RESEND_FROM_NAME',
  'RESEND_WEBHOOK_SECRET',
  'EMAIL_QUEUE_CRON_SECRET',
] as const

export type IntegrationSecretName = typeof INTEGRATION_SECRET_NAMES[number]

export async function getIntegrationSecret(
  adminClient: SupabaseClient,
  name: IntegrationSecretName,
  envNames: string[] = [name],
): Promise<string | null> {
  for (const envName of envNames) {
    const value = Deno.env.get(envName)?.trim()
    if (value) return value
  }

  const { data, error } = await adminClient.rpc('get_integration_secret', { p_name: name })
  if (error) {
    console.error('Failed to read integration secret status', { name, error: error.message })
    return null
  }

  return typeof data === 'string' && data.trim() ? data.trim() : null
}

export async function getIntegrationStatuses(adminClient: SupabaseClient) {
  const { data, error } = await adminClient.rpc('list_integration_secret_status')
  if (error) throw error

  const configured = new Set(
    (data ?? [])
      .filter((row: { configured?: boolean }) => row.configured)
      .map((row: { name: string }) => row.name),
  )

  return INTEGRATION_SECRET_NAMES.map((name) => ({
    name,
    configured: configured.has(name),
  }))
}
