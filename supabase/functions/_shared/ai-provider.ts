import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { getIntegrationSecret } from './integration-secrets.ts'

export interface AiConfig {
  apiKey: string
  baseUrl: string
  model: string
  provider: string
}

export async function loadAiConfig(adminClient: SupabaseClient): Promise<AiConfig | null> {
  const apiKey = await getIntegrationSecret(adminClient, 'AI_PROVIDER_API_KEY')
  if (!apiKey) return null

  const { data: settings } = await adminClient
    .from('admin_settings')
    .select('setting_key, setting_value')
    .in('setting_key', ['ai_provider', 'ai_model'])

  const setting = (key: string) => settings?.find((row) => row.setting_key === key)?.setting_value?.trim()
  const baseUrl = await getIntegrationSecret(adminClient, 'AI_PROVIDER_BASE_URL')

  return {
    apiKey,
    baseUrl: (baseUrl || 'https://api.openai.com/v1').replace(/\/$/, ''),
    model: setting('ai_model') || Deno.env.get('AI_MODEL') || 'gpt-4o-mini',
    provider: setting('ai_provider') || Deno.env.get('AI_PROVIDER') || 'openai-compatible',
  }
}

export function aiChatCompletionsUrl(config: AiConfig) {
  return `${config.baseUrl}/chat/completions`
}

export function aiHeaders(config: AiConfig) {
  return { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' }
}
