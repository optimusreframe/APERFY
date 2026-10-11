import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { getIntegrationSecret } from './integration-secrets.ts'
import { getAiProvider, normalizeAiModel } from './ai-providers.ts'

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

function normalizeBaseUrl(value: string, protocol: AiConfig['protocol']): string {
  const trimmed = value.trim().replace(/\/+$/, '')
  if (!trimmed) return trimmed

  try {
    const url = new URL(trimmed)
    const suffixes = protocol === 'anthropic-messages'
      ? ['/messages', '/chat/completions', '/responses']
      : protocol === 'gemini-generate-content'
        ? ['/models', '/generateContent']
        : ['/chat/completions', '/responses']
    for (const suffix of suffixes) {
      if (url.pathname.endsWith(suffix)) {
        url.pathname = url.pathname.slice(0, -suffix.length).replace(/\/+$/, '') || '/'
        break
      }
    }
    if (protocol === 'openai-compatible' && url.pathname.endsWith('/images')) {
      url.pathname = url.pathname.slice(0, -'/images'.length).replace(/\/+$/, '') || '/'
    }
    return url.toString().replace(/\/$/, '')
  } catch {
    // Keep custom gateway strings intact; fetch will return a useful provider
    // error which is surfaced to the admin below.
    return trimmed
  }
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
  const settings = await loadSettings(adminClient)
  const assignments = parseAssignments(setting(settings, 'ai_provider_assignments'))
  const assigned = assignments[role] || (role === 'vision' ? assignments.image : undefined)
  const provider = assigned?.provider || setting(settings, legacyProviderKey) || Deno.env.get(envProviderKey) || 'openai-compatible'
  const model = assigned?.model || setting(settings, legacyModelKey) || Deno.env.get(envModelKey) || (role === 'text' ? 'gpt-4o-mini' : '')
  const providerDefinition = getAiProvider(provider)
  let apiKey = await getIntegrationSecret(adminClient, keyName)

  // A provider key is independent from a role assignment. When the same
  // provider is assigned to text plus vision/image, allow the operator to
  // save the key once in the text credential slot and reuse it server-side.
  // Different providers never share credentials implicitly.
  if (!apiKey && (role === 'vision' || role === 'image')) {
    const textProvider = assignments.text?.provider || setting(settings, 'ai_provider') || Deno.env.get('AI_PROVIDER') || ''
    if (textProvider.trim().toLowerCase() === provider.trim().toLowerCase()) {
      apiKey = await getIntegrationSecret(adminClient, 'AI_PROVIDER_API_KEY')
    }
  }
  if (!apiKey) return null

  let baseUrl = await getIntegrationSecret(adminClient, baseUrlSecretName)
  if (!baseUrl && (role === 'vision' || role === 'image')) {
    const textProvider = assignments.text?.provider || setting(settings, 'ai_provider') || Deno.env.get('AI_PROVIDER') || ''
    if (textProvider.trim().toLowerCase() === provider.trim().toLowerCase()) {
      baseUrl = await getIntegrationSecret(adminClient, 'AI_PROVIDER_BASE_URL')
    }
  }
  const modelId = normalizeAiModel(provider, model)

  return {
    apiKey,
    // A saved assignment carries the provider-specific endpoint. Prefer it over
    // the legacy shared secret so switching from OpenAI to a native provider
    // cannot accidentally keep the previous provider's base URL.
    baseUrl: normalizeBaseUrl(assigned?.baseUrl || baseUrl || providerDefinition.defaultBaseUrl, providerDefinition.protocol),
    model: modelId,
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
  const isOpenRouter = config.provider.trim().toLowerCase() === 'openrouter'
  return {
    Authorization: `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
    ...(isOpenRouter ? {
      // OpenRouter uses these optional headers for application attribution and
      // keeps them useful for provider-side support without exposing secrets.
      'HTTP-Referer': 'https://aperfy.kpwr.dev',
      'X-Title': 'APERFY',
    } : {}),
  }
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

function isUnsafeRemoteImageUrl(value: string) {
  try {
    const parsed = new URL(value)
    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    if (parsed.protocol !== 'https:') return true
    if (hostname === 'localhost' || hostname.endsWith('.local') || hostname === '169.254.169.254' || hostname === '::1') return true
    if (/^(10\.|127\.)/.test(hostname) || /^192\.168\./.test(hostname) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true
    if (/^(fc|fd|fe80:)/i.test(hostname)) return true
    return false
  } catch {
    return true
  }
}

async function remoteImageToGeminiPart(url: string): Promise<Record<string, unknown>> {
  if (isUnsafeRemoteImageUrl(url)) throw new Error('Gemini solo acepta imágenes remotas HTTPS públicas.')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8_000)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`No se pudo descargar la imagen para Gemini (${response.status}).`)
    const mimeType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    if (!mimeType.startsWith('image/')) throw new Error('La URL no devolvió un archivo de imagen válido.')
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength > 6_000_000) throw new Error('La imagen es demasiado grande para enviarla a Gemini.')
    let binary = ''
    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
    }
    return { inline_data: { mime_type: mimeType, data: btoa(binary) } }
  } finally {
    clearTimeout(timeout)
  }
}

async function openAiContentToGemini(content: unknown): Promise<Array<Record<string, unknown>>> {
  if (typeof content === 'string') return [{ text: content }]
  if (!Array.isArray(content)) return [{ text: String(content || '') }]
  return Promise.all(content.map(async (part) => {
    const item = part as Record<string, unknown>
    if (item.type === 'text') return { text: String(item.text || '') }
    if (item.type === 'image_url') {
      const url = String((item.image_url as Record<string, unknown> | undefined)?.url || '')
      const match = /^data:([^;]+);base64,(.+)$/.exec(url)
      if (match) return { inline_data: { mime_type: match[1], data: match[2] } }
      return remoteImageToGeminiPart(url)
    }
    return item
  }))
}

function openAiContentToResponses(content: unknown): Array<Record<string, unknown>> {
  if (typeof content === 'string') return [{ type: 'input_text', text: content }]
  if (!Array.isArray(content)) return [{ type: 'input_text', text: String(content || '') }]
  return content.map((part) => {
    const item = part as Record<string, unknown>
    if (item.type === 'text') return { type: 'input_text', text: String(item.text || '') }
    if (item.type === 'image_url') {
      const url = String((item.image_url as Record<string, unknown> | undefined)?.url || '')
      return { type: 'input_image', image_url: url, detail: 'auto' }
    }
    return item
  })
}

function normalizeGeminiSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeGeminiSchema)
  if (!value || typeof value !== 'object') return value

  const source = value as Record<string, unknown>
  const normalized: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(source)) {
    if (key === 'additionalProperties') continue
    if (key === 'type' && typeof entry === 'string') {
      normalized[key] = entry.toUpperCase()
    } else if (key === 'properties' && entry && typeof entry === 'object') {
      normalized[key] = Object.fromEntries(Object.entries(entry as Record<string, unknown>).map(([name, schema]) => [name, normalizeGeminiSchema(schema)]))
    } else {
      normalized[key] = normalizeGeminiSchema(entry)
    }
  }
  return normalized
}

async function toGeminiBody(body: Record<string, unknown>) {
  const messages = Array.isArray(body.messages) ? body.messages as Array<Record<string, unknown>> : []
  const systemMessages = messages.filter((message) => message.role === 'system')
  const contents = await Promise.all(messages.filter((message) => message.role !== 'system').map(async (message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: await openAiContentToGemini(message.content) })))
  const declarations = Array.isArray(body.tools) ? (body.tools as Array<Record<string, unknown>>).map((tool) => {
    const fn = (tool.function || {}) as Record<string, unknown>
    return { name: fn.name, description: fn.description, parameters: normalizeGeminiSchema(fn.parameters || { type: 'OBJECT' }) }
  }) : []
  const tools = declarations.length ? [{ function_declarations: declarations }] : undefined
  const choice = body.tool_choice as Record<string, unknown> | undefined
  const choiceFn = choice?.function as Record<string, unknown> | undefined
  const functionCallingConfig = choiceFn?.name ? { mode: 'ANY', allowedFunctionNames: [String(choiceFn.name)] } : undefined
  const generationConfig = isImageGenerationRequest(body)
    ? { responseModalities: ['TEXT', 'IMAGE'] }
    : undefined
  return { ...(systemMessages.length ? { systemInstruction: { parts: [{ text: systemMessages.map((message) => String(message.content || '')).join('\n\n') }] } } : {}), contents, ...(generationConfig ? { generationConfig } : {}), ...(tools ? { tools, ...(functionCallingConfig ? { toolConfig: { functionCallingConfig } } : {}) } : {}) }
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
  const imagePart = parts.find((part) => part.inlineData || part.inline_data) as Record<string, unknown> | undefined
  const imageData = (imagePart?.inlineData || imagePart?.inline_data) as Record<string, unknown> | undefined
  const imageBase64 = typeof imageData?.data === 'string' ? imageData.data : undefined
  const imageMime = String(imageData?.mimeType || imageData?.mime_type || 'image/png')
  const toolCalls = parts.filter((part) => part.functionCall).map((part, index) => {
    const call = part.functionCall as Record<string, unknown>
    return { id: `gemini_${index}`, type: 'function', function: { name: String(call.name || ''), arguments: JSON.stringify(call.args || {}) } }
  })
  return { choices: [{ index: 0, message: { role: 'assistant', content: text, ...(imageBase64 ? { images: [{ type: 'image_url', image_url: { url: `data:${imageMime};base64,${imageBase64}` } }] } : {}), ...(toolCalls.length ? { tool_calls: toolCalls } : {}) }, finish_reason: candidate?.finishReason || 'STOP' }], usage: payload.usageMetadata }
}

function isImageGenerationRequest(body: Record<string, unknown>) {
  return Array.isArray(body.modalities) && (body.modalities as unknown[]).includes('image')
}

function toOpenAiResponsesBody(config: AiConfig, body: Record<string, unknown>) {
  const messages = Array.isArray(body.messages) ? body.messages as Array<Record<string, unknown>> : []
  const input = messages.map((message) => ({
    role: message.role === 'system' ? 'developer' : message.role === 'assistant' ? 'assistant' : 'user',
    content: openAiContentToResponses(message.content),
  }))
  const configuredModel = String(body.model || config.model)
  // OpenAI's image tool is attached to a mainline Responses model. If an
  // operator entered a GPT Image model ID, keep it as the tool model and use
  // the documented mainline default for the orchestration model.
  const imageModel = /^gpt-image/i.test(configuredModel) ? configuredModel : undefined
  const mainModel = (imageModel || /^gpt-4/i.test(configuredModel)) ? 'gpt-5' : configuredModel
  return {
    model: mainModel,
    input,
    tools: [{ type: 'image_generation', ...(imageModel ? { model: imageModel } : {}) }],
  }
}

function normalizeOpenAiResponses(payload: Record<string, unknown>) {
  const outputs = Array.isArray(payload.output) ? payload.output as Array<Record<string, unknown>> : []
  const imageCall = outputs.find((item) => item.type === 'image_generation_call' && typeof item.result === 'string')
  const result = imageCall?.result as string | undefined
  const imageUrl = result
    ? (result.startsWith('data:image') ? result : `data:image/png;base64,${result}`)
    : undefined
  const outputText = typeof payload.output_text === 'string' ? payload.output_text : ''
  return {
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: outputText,
        ...(imageUrl ? { images: [{ type: 'image_url', image_url: { url: imageUrl } }] } : {}),
      },
      finish_reason: imageUrl ? 'stop' : 'length',
    }],
    usage: payload.usage,
  }
}

function openRouterImageRequestBody(body: Record<string, unknown>) {
  const messages = Array.isArray(body.messages) ? body.messages as Array<Record<string, unknown>> : []
  const promptParts: string[] = []
  const inputReferences: Array<Record<string, unknown>> = []

  for (const message of messages) {
    const role = String(message.role || 'user')
    const content = message.content
    if (typeof content === 'string' && content.trim()) {
      promptParts.push(role === 'system' ? `System instructions:\n${content.trim()}` : content.trim())
      continue
    }
    if (!Array.isArray(content)) continue
    for (const part of content as Array<Record<string, unknown>>) {
      if (part.type === 'text' && typeof part.text === 'string' && part.text.trim()) {
        promptParts.push(role === 'system' ? `System instructions:\n${part.text.trim()}` : part.text.trim())
      }
      if (part.type === 'image_url') {
        const imageUrl = String((part.image_url as Record<string, unknown> | undefined)?.url || '')
        if (imageUrl) {
          inputReferences.push({ type: 'image_url', image_url: { url: imageUrl } })
        }
      }
    }
  }

  const result: Record<string, unknown> = {
    model: String(body.model || ''),
    prompt: promptParts.join('\n\n').trim() || 'Generate a professional ecommerce product image.',
  }
  if (inputReferences.length) result.input_references = inputReferences

  // Preserve optional image controls when a caller provides them. The admin
  // workflows currently use the defaults, but this keeps the native adapter
  // useful for future aspect-ratio and quality controls.
  for (const key of ['n', 'size', 'resolution', 'aspect_ratio', 'quality', 'output_format', 'background', 'output_compression', 'seed']) {
    if (body[key] !== undefined) result[key] = body[key]
  }
  return result
}

function normalizeOpenRouterImage(payload: Record<string, unknown>) {
  const data = Array.isArray(payload.data) ? payload.data as Array<Record<string, unknown>> : []
  const first = data[0] || {}
  const encoded = typeof first.b64_json === 'string' ? first.b64_json : ''
  const mediaType = typeof first.media_type === 'string' && first.media_type.startsWith('image/') ? first.media_type : 'image/png'
  const directUrl = typeof first.url === 'string' ? first.url : ''
  const imageUrl = encoded ? `data:${mediaType};base64,${encoded}` : directUrl

  return {
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: '',
        ...(imageUrl ? { images: [{ type: 'image_url', image_url: { url: imageUrl } }] } : {}),
      },
      finish_reason: imageUrl ? 'stop' : 'length',
    }],
    ...(payload.usage ? { usage: payload.usage } : {}),
  }
}

export async function callAi(config: AiConfig, body: Record<string, unknown>): Promise<Response> {
  if (config.protocol === 'openai-compatible') {
    if (config.provider.trim().toLowerCase() === 'openrouter' && isImageGenerationRequest(body)) {
      const upstream = await fetch(`${config.baseUrl}/images`, {
        method: 'POST',
        headers: aiHeaders(config),
        body: JSON.stringify(openRouterImageRequestBody(body)),
      })
      if (!upstream.ok) return responseFromPayload(await errorPayload(upstream, 'OpenRouter image generation failed'), upstream.status)
      return responseFromPayload(normalizeOpenRouterImage(await upstream.json()))
    }
    if (config.provider === 'openai' && isImageGenerationRequest(body)) {
      const upstream = await fetch(`${config.baseUrl}/responses`, {
        method: 'POST',
        headers: aiHeaders(config),
        body: JSON.stringify(toOpenAiResponsesBody(config, body)),
      })
      if (!upstream.ok) return responseFromPayload(await errorPayload(upstream, 'OpenAI image generation failed'), upstream.status)
      return responseFromPayload(normalizeOpenAiResponses(await upstream.json()))
    }
    return fetch(aiChatCompletionsUrl(config), { method: 'POST', headers: aiHeaders(config), body: JSON.stringify(body) })
  }

  if (config.protocol === 'anthropic-messages' && isImageGenerationRequest(body)) {
    return responseFromPayload({ error: { message: `${config.provider} no soporta generación de imágenes en APERFY. Asigna un proveedor con capacidad de imagen.` } }, 422)
  }

  if (config.protocol === 'anthropic-messages') {
    const upstream = await fetch(`${config.baseUrl}/messages`, { method: 'POST', headers: { 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }, body: JSON.stringify(toAnthropicBody(body)) })
    if (!upstream.ok) return responseFromPayload(await errorPayload(upstream, 'Anthropic request failed'), upstream.status)
    return responseFromPayload(normalizeAnthropicResponse(await upstream.json()))
  }

  const configuredModel = String(body.model || config.model).replace(/^models\//, '')
  const model = isImageGenerationRequest(body) && !/image|nano-banana/i.test(configuredModel)
    ? 'gemini-3.1-flash-image'
    : configuredModel
  const upstream = await fetch(`${config.baseUrl}/models/${encodeURIComponent(model)}:generateContent`, { method: 'POST', headers: { 'x-goog-api-key': config.apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify(await toGeminiBody(body)) })
  if (!upstream.ok) return responseFromPayload(await errorPayload(upstream, 'Gemini request failed'), upstream.status)
  return responseFromPayload(normalizeGeminiResponse(await upstream.json()))
}
