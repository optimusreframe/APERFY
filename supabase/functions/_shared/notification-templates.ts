import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export type NotificationChannel = 'email' | 'telegram' | 'whatsapp' | 'push' | 'in_app'

export type NotificationTemplate = {
  event_key: string
  channel: NotificationChannel
  locale: 'es' | 'en'
  subject: string | null
  body_text: string
  body_html: string | null
  enabled: boolean
}

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

export function renderNotificationTemplate(template: string, data: Record<string, unknown>, html = false): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = data[key] ?? ''
    return html ? escapeHtml(value) : String(value)
  })
}

export async function getNotificationTemplate(
  client: SupabaseClient,
  eventKey: string,
  channel: NotificationChannel,
  locale: 'es' | 'en',
): Promise<NotificationTemplate | null> {
  const { data, error } = await client
    .from('notification_templates')
    .select('event_key, channel, locale, subject, body_text, body_html, enabled')
    .eq('event_key', eventKey)
    .eq('channel', channel)
    .eq('locale', locale)
    .eq('enabled', true)
    .maybeSingle()
  if (error) {
    console.warn('Notification template lookup failed', { eventKey, channel, locale, error })
    return null
  }
  return data as NotificationTemplate | null
}
