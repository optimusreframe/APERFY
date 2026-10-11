import { createClient } from 'npm:@supabase/supabase-js@2'
import { getAiProvider } from '../_shared/ai-providers.ts'
import { getIntegrationSecret } from '../_shared/integration-secrets.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ModelRole = 'text' | 'vision' | 'image'
type RawModel = Record<string, unknown>

interface ModelOption {
  id: string
  label: string
  createdAt: number | null
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

function getBearerToken(req: Request) {
  const value = req.headers.get('authorization') ?? ''
  return value.startsWith('Bearer ') ? value.slice(7) : null
}

async function requireAdmin(req: Request) {
  const token = getBearerToken(req)
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!token || !supabaseUrl || !serviceRoleKey) return null

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const { data: userData, error: userError } = await adminClient.auth.getUser(token)
  if (userError || !userData.user) return null

  const { data: role, error: roleError } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)
    .eq('role', 'admin')
    .maybeSingle()

  if (roleError || !role) return null
  return { adminClient }
}

function setting(rows: Array<{ setting_key: string; setting_value: string | null }>, key: string) {
  return rows.find((row) => row.setting_key === key)?.setting_value?.trim() || ''
}

function parseAssignments(value: string) {
  if (!value) return {} as Record<string, { provider?: string; model?: string; baseUrl?: string }>
  try {
    return JSON.parse(value) as Record<string, { provider?: string; model?: string; baseUrl?: string }>
  } catch {
    return {}
  }
}

function normalizeBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  const url = new URL(trimmed)
  if (url.protocol !== 'https:') throw new Error('El Base URL debe usar HTTPS.')

  for (const suffix of ['/chat/completions', '/responses', '/models', '/images']) {
    if (url.pathname.endsWith(suffix)) {
      url.pathname = url.pathname.slice(0, -suffix.length).replace(/\/+$/, '') || '/'
      break
    }
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.local') || host === '169.254.169.254' || host === '::1') throw new Error('El Base URL no es válido.')
  if (/^(10\.|127\.)/.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) throw new Error('El Base URL no es válido.')
  return url.toString().replace(/\/$/, '')
}

function customProviderBaseUrl(rows: Array<{ setting_key: string; setting_value: string | null }>, provider: string) {
  const raw = setting(rows, 'ai_custom_providers')
  if (!raw) return ''
  try {
    const providers = JSON.parse(raw) as Array<{ id?: string; defaultBaseUrl?: string }>
    const match = providers.find((item) => item.id?.trim().toLowerCase() === provider)
    return match?.defaultBaseUrl?.trim() || ''
  } catch {
    return ''
  }
}

async function loadProviderKey(
  adminClient: ReturnType<typeof createClient>,
  rows: Array<{ setting_key: string; setting_value: string | null }>,
  role: ModelRole,
  provider: string,
) {
  const roleKey = role === 'text' ? 'AI_PROVIDER_API_KEY' : 'AI_IMAGE_PROVIDER_API_KEY'
  const key = await getIntegrationSecret(adminClient, roleKey)
  if (key || role === 'text') return key

  const assignments = parseAssignments(setting(rows, 'ai_provider_assignments'))
  const configuredTextProvider = assignments.text?.provider || setting(rows, 'ai_provider') || Deno.env.get('AI_PROVIDER') || ''
  if (configuredTextProvider.trim().toLowerCase() !== provider) return null
  return getIntegrationSecret(adminClient, 'AI_PROVIDER_API_KEY')
}

function authHeaders(provider: string, apiKey: string) {
  if (provider === 'gemini') {
    return { 'x-goog-api-key': apiKey, Accept: 'application/json' }
  }
  if (provider === 'anthropic') {
    return { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', Accept: 'application/json' }
  }
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
    ...(provider === 'openrouter' ? { 'HTTP-Referer': 'https://aperfy.kpwr.dev', 'X-Title': 'APERFY' } : {}),
  }
}

function withQuery(url: string, params: Record<string, string>) {
  const target = new URL(url)
  for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value)
  return target.toString()
}

function qwenModelsUrl(baseUrl: string) {
  const target = new URL(baseUrl)
  target.pathname = target.pathname.replace(/\/compatible-mode\/v1\/?$/, '/api/v1/models')
  if (!target.pathname.endsWith('/models')) target.pathname = '/api/v1/models'
  return target.toString()
}

async function fetchJson(url: string, provider: string, apiKey: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)
  try {
    const response = await fetch(url, { headers: authHeaders(provider, apiKey), signal: controller.signal })
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>
    if (!response.ok) {
      const error = payload.error && typeof payload.error === 'object' ? payload.error as Record<string, unknown> : {}
      throw new Error(`El proveedor respondió ${response.status}: ${String(error.message || payload.message || 'no se pudo consultar el catálogo')}`)
    }
    return payload
  } finally {
    clearTimeout(timeout)
  }
}

async function listRawModels(baseUrl: string, provider: string, role: ModelRole, apiKey: string) {
  if (provider === 'openrouter') {
    const endpoint = role === 'image' ? `${baseUrl}/images/models` : `${baseUrl}/models`
    const query = role === 'image'
      ? { sort: 'newest' }
      : role === 'vision'
        ? { input_modalities: 'image', sort: 'newest' }
        : { output_modalities: 'text', sort: 'newest' }
    return (await fetchJson(withQuery(endpoint, query), provider, apiKey)).data as RawModel[] || []
  }

  if (provider === 'qwen') {
    const models: RawModel[] = []
    for (let page = 1; page <= 20; page += 1) {
      const payload = await fetchJson(qwenModelsUrl(withQuery(baseUrl, { page_no: String(page), page_size: '100' })), provider, apiKey)
      const output = payload.output && typeof payload.output === 'object' ? payload.output as RawModel : {}
      const pageModels = Array.isArray(output.models) ? output.models as RawModel[] : []
      models.push(...pageModels)
      const total = Number(output.total || 0)
      if (!pageModels.length || !total || page * 100 >= total) break
    }
    return models
  }

  const models: RawModel[] = []
  let next = ''
  for (let page = 0; page < 10; page += 1) {
    let url = `${baseUrl}/models`
    if (provider === 'gemini') {
      url = withQuery(url, { pageSize: '100' })
      if (next) url = withQuery(url, { pageToken: next })
    } else {
      url = withQuery(url, { limit: '100' })
      if (next) url = withQuery(url, { [provider === 'anthropic' ? 'after_id' : 'after']: next })
    }

    const payload = await fetchJson(url, provider, apiKey)
    const pageModels = (provider === 'gemini' ? payload.models : payload.data) as RawModel[] || []
    models.push(...pageModels)

    const hasMore = payload.has_more === true
    const nextToken = provider === 'gemini'
      ? String(payload.nextPageToken || '')
      : String(payload.last_id || pageModels.at(-1)?.id || '')
    if (!nextToken || (!hasMore && provider !== 'gemini')) break
    next = nextToken
  }
  return models
}

function modelId(model: RawModel) {
  return String(model.id || model.model || model.name || '').replace(/^models\//, '').trim()
}

function modelCreatedAt(model: RawModel) {
  const value = model.created ?? model.created_at ?? model.createTime ?? model.createdAt ?? model.published_time
  if (typeof value === 'number' && Number.isFinite(value)) return value > 10_000_000_000 ? Math.round(value / 1000) : value
  if (typeof value === 'string' && value.trim()) {
    const asNumber = Number(value)
    if (Number.isFinite(asNumber)) return asNumber > 10_000_000_000 ? Math.round(asNumber / 1000) : asNumber
    const asDate = Date.parse(value)
    if (Number.isFinite(asDate)) return Math.round(asDate / 1000)
  }
  return null
}

function hasModality(model: RawModel, key: 'input' | 'output', modality: string) {
  const architecture = model.architecture && typeof model.architecture === 'object' ? model.architecture as RawModel : {}
  const values = architecture[`${key}_modalities`]
  return Array.isArray(values) && values.some((value) => String(value).toLowerCase() === modality)
}

function supportsRole(model: RawModel, provider: string, role: ModelRole) {
  const id = modelId(model).toLowerCase()
  if (!id) return false

  if (provider === 'qwen') {
    const capabilities = Array.isArray(model.capabilities) ? model.capabilities.map((value) => String(value).toLowerCase()) : []
    if (role === 'image') return capabilities.includes('ig') || /image|wan/.test(id)
    if (role === 'vision') return capabilities.includes('vu') || capabilities.includes('multimodal-omni') || /vl|vision|omni/.test(id)
    return capabilities.length === 0 || capabilities.includes('tg') || capabilities.includes('reasoning') || capabilities.includes('multimodal-omni')
  }

  if (role === 'image') {
    if (provider === 'openrouter') return hasModality(model, 'output', 'image')
    if (provider === 'gemini') return /image|imagen|nano[-_ ]?banana/.test(id)
    if (provider === 'openai') return /gpt-image|dall-e/.test(id)
    if (provider === 'openai-compatible') return true
    return /image|imagen|dall-e|flux|wan/.test(id)
  }

  if (/embedding|moderation|whisper|transcri|tts|speech|realtime|dall-e|gpt-image/.test(id)) return false
  if (role === 'vision') {
    if (provider === 'openrouter') return hasModality(model, 'input', 'image')
    if (provider === 'qwen') return /vl|vision|omni/.test(id)
    if (provider === 'deepseek') return false
    return true
  }
  return true
}

function normalizeModels(rawModels: RawModel[], provider: string, role: ModelRole): ModelOption[] {
  const seen = new Set<string>()
  return rawModels
    .filter((model) => supportsRole(model, provider, role))
    .map((model) => {
      const id = modelId(model)
      const label = String(model.display_name || model.displayName || model.name || id).replace(/^models\//, '')
      return { id, label, createdAt: modelCreatedAt(model) }
    })
    .filter((model) => {
      if (!model.id || seen.has(model.id)) return false
      seen.add(model.id)
      return true
    })
    .sort((left, right) => {
      const createdDiff = (right.createdAt || 0) - (left.createdAt || 0)
      return createdDiff || left.label.localeCompare(right.label)
    })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  const auth = await requireAdmin(req)
  if (!auth) return json({ error: 'Admin access required' }, 403)

  try {
    const body = await req.json().catch(() => ({})) as { provider?: unknown; role?: unknown; baseUrl?: unknown }
    const provider = String(body.provider || '').trim().toLowerCase()
    const role = String(body.role || '') as ModelRole
    if (!provider || !['text', 'vision', 'image'].includes(role)) return json({ error: 'Proveedor y función son obligatorios.' }, 400)

    const { data: rows, error: settingsError } = await auth.adminClient
      .from('admin_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['ai_provider', 'ai_provider_assignments', 'ai_custom_providers'])
    if (settingsError) throw settingsError
    const settings = (rows || []) as Array<{ setting_key: string; setting_value: string | null }>
    const definition = getAiProvider(provider)
    const configuredCustomBaseUrl = customProviderBaseUrl(settings, provider)
    const requestedBaseUrl = typeof body.baseUrl === 'string' && body.baseUrl.trim() ? body.baseUrl : configuredCustomBaseUrl || definition.defaultBaseUrl
    const baseUrl = normalizeBaseUrl(requestedBaseUrl)
    const apiKey = await loadProviderKey(auth.adminClient, settings, role, provider)
    if (!apiKey) return json({ error: 'Configura primero la API key de este proveedor en AI Credentials.', code: 'AI_CREDENTIAL_REQUIRED' }, 400)

    const rawModels = await listRawModels(baseUrl, provider, role, apiKey)
    const models = normalizeModels(rawModels, provider, role)
    return json({ provider, role, models, updatedAt: new Date().toISOString() })
  } catch (error) {
    console.error('AI model catalog failed', error)
    return json({ error: 'No se pudo consultar el catálogo de modelos del proveedor.', code: 'AI_MODEL_CATALOG_ERROR' }, 502)
  }
})
