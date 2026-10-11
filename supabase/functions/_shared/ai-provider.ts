import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { getIntegrationSecret } from './integration-secrets.ts'
import { getAiProvider } from './ai-providers.ts'

export type AiProviderRole = 'text' | 'vision' | 'image' | 'video'

export interface AiProviderAssignment {
  provider: string
  model: string
  baseUrl?: string
}

export interface AiConfig {
  apiKey: string
  baseUrl: string
  model: string
  provider: string
  protocol: ReturnType<typeof getAiProvider>['protocol']
  role?: AiProviderRole
}

type SettingRow = { setting_key: string; setting_value: string | null }

function parseAssignments(value?: string | null): Partial<Record<AiProviderRole, AiProviderAssignment>> {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>
    const result: Partial<Record<AiProviderRole, AiProviderAssignment>> = {}
    for (const role of ['text', 'vision', 'image', 'video'] as AiProviderRole[]) {
      const item = parsed[role]
      if (!item || typeof item !== 'object') continue
      const candidate = item as Record<string, unknown>
      if (typeof candidate.provider === 'string' && typeof candidate.model === 'string') {
        result[role] = {
          provider: candidate.provider.trim(),
          model: candidate.model.trim(),
          ...(typeof candidate.baseUrl === 'string' ? { baseUrl: candidate.baseUrl.trim() } : {}),
        }
      }
    }
    return result
  } catch {
    return {}
  }
}

async function loadSettings(adminClient: SupabaseClient): Promise<SettingRow[]> {
  const { data } = await adminClient
    .from('admin_settings')
    .select('setting_key, setting_value')
    .in('setting_key', ['ai_provider', 'ai_model', 'ai_image_provider', 'ai_image_model', 'ai_provider_assignments'])
  return (data || []) as SettingRow[]
}

function setting(settings: SettingRow[], key: string) {
  return settings.find((row) => row.setting_key === key)?.setting_value?.trim() || ''
}

async function loadConfig(
  adminClient: SupabaseClient,
  role: AiProviderRole,
  keyName: 'AI_PROVIDER_API_KEY' | 'AI_IMAGE_PROVIDER_API_KEY' | 'AI_VIDEO_PROVIDER_API_KEY',
  baseUrlSecretName: 'AI_PROVIDER_BASE_URL' | 'AI_IMAGE_PROVIDER_BASE_URL' | 'AI_VIDEO_PROVIDER_BASE_URL',
  legacyProviderKey: string,
  legacyModelKey: string,
  envProviderKey: string,
  envModelKey: string,
): Promise<AiConfig | null> {
  const apiKey = await getIntegrationSecret(adminClient, keyName)
  if (!apiKey) return null

  const settings = await loadSettings(adminClient)
  const assignments = parseAssignments(setting(settings, 'ai_provider_assignments'))
  const assigned = assignments[role] || (role === 'vision' ? assignments.image : undefined)
  const provider = assigned?.provider || setting(settings, legacyProviderKey) || Deno.env.get(envProviderKey) || 'openai-compatible'
  const model = assigned?.model || setting(settings, legacyModelKey) || Deno.env.get(envModelKey) || (role === 'text' ? 'gpt-4o-mini' : '')
  const providerDefinition = getAiProvider(provider)
  const baseUrl = await getIntegrationSecret(adminClient, baseUrlSecretName)

  return {
    apiKey,
    baseUrl: (baseUrl || assigned?.baseUrl || providerDefinition.defaultBaseUrl).replace(/\/$/, ''),
    model,
    provider,
    protocol: providerDefinition.protocol,
    role,
  }
}

export async function loadAiConfig(adminClient: SupabaseClient): Promise<AiConfig | null> {
  return loadConfig(adminClient, 'text', 'AI_PROVIDER_API_KEY', 'AI_PROVIDER_BASE_URL', 'ai_provider', 'ai_model', 'AI_PROVIDER', 'AI_MODEL')
}

export async function loadAiVisionConfig(adminClient: SupabaseClient): Promise<AiConfig | null> {
  return loadConfig(adminClient, 'vision', 'AI_IMAGE_PROVIDER_API_KEY', 'AI_IMAGE_PROVIDER_BASE_URL', 'ai_image_provider', 'ai_image_model', 'AI_IMAGE_PROVIDER', 'AI_IMAGE_MODEL')
}

export async function loadAiImageGenerationConfig(adminClient: SupabaseClient): Promise<AiConfig | null> {
  return loadConfig(adminClient, 'image', 'AI_IMAGE_PROVIDER_API_KEY', 'AI_IMAGE_PROVIDER_BASE_URL', 'ai_image_provider', 'ai_image_model', 'AI_IMAGE_PROVIDER', 'AI_IMAGE_MODEL')
}

export async function loadAiVideoConfig(adminClient: SupabaseClient): Promise<AiConfig | null> {
  return loadConfig(adminClient, 'video', 'AI_VIDEO_PROVIDER_API_KEY', 'AI_VIDEO_PROVIDER_BASE_URL', 'ai_video_provider', 'ai_video_model', 'AI_VIDEO_PROVIDER', 'AI_VIDEO_MODEL')
}

export const loadAiImageConfig = loadAiVisionConfig

export function aiChatCompletionsUrl(config: AiConfig) {
  return `${config.baseUrl}/chat/completions`
}

export function aiHeaders(config: AiConfig) {
  return { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' }
}

function responseFromPayload(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } })
}

function errorPayload(response: Response, fallback: string) {
  return response.text().catch(() => fallback).then((text) => {
    try { return JSON.parse(text) } catch { return { error: { message: text || fallback } } }
  })
}

function openAiContentToAnthropic(content: unknown): unknown {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return String(content || '')
  return content.map((part) => {
    const item = part as Record<string, unknown>
    if (item.type === 'text') return { type: 'text', text: String(item.text || '') }
    if (item.type === 'image_url') {
      const url = String((item.image_url as Record<string, unknown> | undefined)?.url || '')
      const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(url)
      if (match) return { type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } }
      return { type: 'image', source: { type: 'url', url } }
    }
    return item
  })
}

function toAnthropicBody(body: Record<string, unknown>) {
  const messages = Array.isArray(body.messages) ? body.messages as Array<Record<string, unknown>> : []
  const system = messages.filter((message) => message.role === 'system').map((message) => String(message.content || '')).join('\n\n')
  const convertedMessages = messages.filter((message) => message.role !== 'system').map((message) => ({ role: message.role === 'assistant' ? 'assistant' : 'user', content: openAiContentToAnthropic(message.content) }))
  const tools = Array.isArray(body.tools) ? (body.tools as Array<Record<string, unknown>>).map((tool) => {
    const fn = (tool.function || {}) as Record<string, unknown>
    return { name: String(fn.name || ''), description: String(fn.description || ''), input_schema: fn.parameters || { type: 'object' } }
  }) : undefined
  const choice = body.tool_choice as Record<string, unknown> | undefined
  const choiceFn = choice?.function as Record<string, unknown> | undefined
  const anthropicChoice = choiceFn?.name ? { type: 'tool', name: String(choiceFn.name) } : undefined
  return { model: body.model, max_tokens: body.max_tokens || 4096, ...(system ? { system } : {}), messages: convertedMessages, ...(tools?.length ? { tools, ...(anthropicChoice ? { tool_choice: anthropicChoice } : {}) } : {}) }
}

function openAiContentToGemini(content: unknown): Array<Record<string, unknown>> {
  if (typeof content === 'string') return [{ text: content }]
  if (!Array.isArray(content)) return [{ text: String(content || '') }]
  return content.map((part) => {
    const item = part as Record<string, unknown>
    if (item.type === 'text') return { text: String(item.text || '') }
    if (item.type === 'image_url') {
      const url = String((item.image_url as Record<string, unknown> | undefined)?.url || '')
      const match = /^data:([^;]+);base64,(.+)$/.exec(url)
      if (match) return { inline_data: { mime_type: match[1], data: match[2] } }
      return { file_data: { mime_type: 'image/*', file_uri: url } }
    }
    return item
  })
}

function toGeminiBody(body: Record<string, unknown>) {
  const messages = Array.isArray(body.messages) ? body.messages as Array<Record<string, unknown>> : []
  const systemMessages = messages.filter((message) => message.role === 'system')
  const contents = messages.filter((message) => message.role !== 'system').map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: openAiContentToGemini(message.content) }))
  const tools = Array.isArray(body.tools) ? [{ function_declarations: (body.tools as Array<Record<string, unknown>>).map((tool) => {
    const fn = (tool.function || {}) as Record<string, unknown>
    return { name: fn.name, description: fn.description, parameters: fn.parameters || { type: 'OBJECT' } }
  }) }] : undefined
  const choice = body.tool_choice as Record<string, unknown> | undefined
  const choiceFn = choice?.function as Record<string, unknown> | undefined
  const functionCallingConfig = choiceFn?.name ? { mode: 'ANY', allowed_function_names: [String(choiceFn.name)] } : undefined
  return { ...(systemMessages.length ? { systemInstruction: { parts: [{ text: systemMessages.map((message) => String(message.content || '')).join('\n\n') }] } } : {}), contents, ...(tools ? { tools, ...(functionCallingConfig ? { toolConfig: { functionCallingConfig } } : {}) } : {}) }
}

function normalizeAnthropicResponse(payload: Record<string, unknown>) {
  const blocks = Array.isArray(payload.content) ? payload.content as Array<Record<string, unknown>> : []
  const text = blocks.filter((block) => block.type === 'text').map((block) => String(block.text || '')).join('')
  const toolCalls = blocks.filter((block) => block.type === 'tool_use').map((block, index) => ({ id: String(block.id || `tool_${index}`), type: 'function', function: { name: String(block.name || ''), arguments: JSON.stringify(block.input || {}) } }))
  return { choices: [{ index: 0, message: { role: 'assistant', content: text, ...(toolCalls.length ? { tool_calls: toolCalls } : {}) }, finish_reason: payload.stop_reason || 'stop' }], usage: payload.usage }
}

function normalizeGeminiResponse(payload: Record<string, unknown>) {
  const candidate = (payload.candidates as Array<Record<string, unknown>> | undefined)?.[0]
  const parts = ((candidate?.content as Record<string, unknown> | undefined)?.parts || []) as Array<Record<string, unknown>>
  const text = parts.filter((part) => typeof part.text === 'string').map((part) => String(part.text)).join('')
  const toolCalls = parts.filter((part) => part.functionCall).map((part, index) => {
    const call = part.functionCall as Record<string, unknown>
    return { id: `gemini_${index}`, type: 'function', function: { name: String(call.name || ''), arguments: JSON.stringify(call.args || {}) } }
  })
  return { choices: [{ index: 0, message: { role: 'assistant', content: text, ...(toolCalls.length ? { tool_calls: toolCalls } : {}) }, finish_reason: candidate?.finishReason || 'STOP' }], usage: payload.usageMetadata }
}

export async function callAi(config: AiConfig, body: Record<string, unknown>): Promise<Response> {
  if (config.protocol === 'openai-compatible') {
    return fetch(aiChatCompletionsUrl(config), { method: 'POST', headers: aiHeaders(config), body: JSON.stringify(body) })
  }

  if (Array.isArray(body.modalities) && (body.modalities as unknown[]).includes('image')) {
    return responseFromPayload({ error: { message: `${config.provider} no soporta generación de imágenes en APERFY. Asigna un proveedor con capacidad de imagen.` } }, 422)
  }

  if (config.protocol === 'anthropic-messages') {
    const upstream = await fetch(`${config.baseUrl}/messages`, { method: 'POST', headers: { 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }, body: JSON.stringify(toAnthropicBody(body)) })
    if (!upstream.ok) return responseFromPayload(await errorPayload(upstream, 'Anthropic request failed'), upstream.status)
    return responseFromPayload(normalizeAnthropicResponse(await upstream.json()))
  }

  const model = String(body.model || config.model).replace(/^models\//, '')
  const upstream = await fetch(`${config.baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toGeminiBody(body)) })
  if (!upstream.ok) return responseFromPayload(await errorPayload(upstream, 'Gemini request failed'), upstream.status)
  return responseFromPayload(normalizeGeminiResponse(await upstream.json()))
}
