import { callAi, type AiConfig } from './ai-provider.ts'

type JsonRecord = Record<string, unknown>

export type StructuredAiTool = {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: JsonRecord
  }
}

type StructuredAiOptions = {
  messages: Array<Record<string, unknown>>
  tool: StructuredAiTool
  /** A compact schema description used by providers that do not support tools. */
  fallbackSchema: string
  maxTokens?: number
}

type StructuredAiResult = {
  data?: unknown
  response: Response
  usedFallback: boolean
}

function responseFromPayload(payload: unknown, status: number, headers?: Headers) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...(headers ? Object.fromEntries(headers.entries()) : {}) },
  })
}

function parseJson(value: unknown): unknown | undefined {
  if (typeof value !== 'string') return undefined
  const cleaned = value
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
  if (!cleaned) return undefined

  try {
    return JSON.parse(cleaned)
  } catch {
    const objectStart = cleaned.indexOf('{')
    const objectEnd = cleaned.lastIndexOf('}')
    if (objectStart >= 0 && objectEnd > objectStart) {
      try { return JSON.parse(cleaned.slice(objectStart, objectEnd + 1)) } catch { /* Try an array below. */ }
    }
    const arrayStart = cleaned.indexOf('[')
    const arrayEnd = cleaned.lastIndexOf(']')
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      try { return JSON.parse(cleaned.slice(arrayStart, arrayEnd + 1)) } catch { return undefined }
    }
    return undefined
  }
}

async function readResponse(response: Response) {
  const text = await response.text().catch(() => '')
  let payload: unknown = { error: { message: text } }
  try { payload = text ? JSON.parse(text) : {} } catch { /* Keep the text wrapper. */ }
  return { payload, text }
}

function toolArguments(payload: unknown, toolName: string): unknown | undefined {
  const root = payload && typeof payload === 'object' ? payload as JsonRecord : {}
  const choices = Array.isArray(root.choices) ? root.choices : []
  const message = choices[0] && typeof choices[0] === 'object'
    ? ((choices[0] as JsonRecord).message as JsonRecord | undefined)
    : undefined
  const calls = Array.isArray(message?.tool_calls) ? message.tool_calls : []
  const call = calls.find((item) => item && typeof item === 'object' && String(((item as JsonRecord).function as JsonRecord | undefined)?.name || '') === toolName) as JsonRecord | undefined
  const args = call?.function && typeof call.function === 'object'
    ? (call.function as JsonRecord).arguments
    : undefined
  if (typeof args === 'object') return args
  return parseJson(args)
}

function responseContent(payload: unknown): string {
  const root = payload && typeof payload === 'object' ? payload as JsonRecord : {}
  const choices = Array.isArray(root.choices) ? root.choices : []
  const message = choices[0] && typeof choices[0] === 'object'
    ? ((choices[0] as JsonRecord).message as JsonRecord | undefined)
    : undefined
  if (typeof message?.content === 'string') return message.content
  if (Array.isArray(message?.content)) {
    return message.content.map((part) => part && typeof part === 'object' ? String((part as JsonRecord).text || '') : '').join('')
  }
  return ''
}

function shouldFallback(status: number) {
  return status === 400 || status === 404 || status === 422
}

/**
 * Calls a provider with native function calling first, then retries compatible
 * providers with plain JSON when the model rejects tools or tool_choice.
 * Scraped pages and image content remain in the original user message; the
 * fallback only changes the response contract and never executes page content.
 */
export async function callStructuredAi(config: AiConfig, options: StructuredAiOptions): Promise<StructuredAiResult> {
  const toolResponse = await callAi(config, {
    model: config.model,
    messages: options.messages,
    tools: [options.tool],
    tool_choice: { type: 'function', function: { name: options.tool.function.name } },
    ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
  })
  const originalStatus = toolResponse.status
  const originalHeaders = toolResponse.headers
  const { payload: originalPayload } = await readResponse(toolResponse)
  const directData = toolArguments(originalPayload, options.tool.function.name)
  if (toolResponse.ok && directData !== undefined) {
    return { data: directData, response: responseFromPayload(originalPayload, originalStatus, originalHeaders), usedFallback: false }
  }

  if (!shouldFallback(originalStatus) && !toolResponse.ok) {
    return { response: responseFromPayload(originalPayload, originalStatus, originalHeaders), usedFallback: false }
  }

  const fallbackMessages = [
    {
      role: 'system',
      content: `Return ONLY valid JSON. Do not use Markdown, code fences, commentary, or function calls. The JSON must match this schema exactly:\n${options.fallbackSchema}`,
    },
    ...options.messages,
  ]
  const fallbackResponse = await callAi(config, {
    model: config.model,
    messages: fallbackMessages,
    ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
  })
  const { payload: fallbackPayload } = await readResponse(fallbackResponse)
  const fallbackData = parseJson(responseContent(fallbackPayload))
  if (fallbackResponse.ok && fallbackData !== undefined) {
    return { data: fallbackData, response: responseFromPayload(fallbackPayload, fallbackResponse.status, fallbackResponse.headers), usedFallback: true }
  }

  // Prefer the fallback's provider detail when it failed; otherwise return the
  // original tool-call error, which usually contains the useful 400 message.
  return fallbackResponse.status !== 200
    ? { response: responseFromPayload(fallbackPayload, fallbackResponse.status, fallbackResponse.headers), usedFallback: true }
    : { response: responseFromPayload(originalPayload, originalStatus, originalHeaders), usedFallback: true }
}
