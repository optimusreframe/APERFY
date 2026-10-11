export type AiProtocol = "openai-compatible" | "anthropic-messages" | "gemini-generate-content";

export type AiCapability = "text" | "tools" | "vision" | "image-generation";

export interface AiProviderDefinition {
  id: string;
  label: string;
  description: string;
  protocol: AiProtocol;
  defaultBaseUrl: string;
  capabilities: AiCapability[];
}

/**
 * The provider registry is deliberately small and explicit. Providers that
 * expose the OpenAI chat contract share one adapter; native protocols get a
 * dedicated adapter in ai-provider.ts.
 */
export const AI_PROVIDERS: AiProviderDefinition[] = [
  {
    id: "openai",
    label: "GPT / OpenAI",
    description: "Modelos GPT para texto, herramientas y visión.",
    protocol: "openai-compatible",
    defaultBaseUrl: "https://api.openai.com/v1",
    capabilities: ["text", "tools", "vision", "image-generation"],
  },
  {
    id: "anthropic",
    label: "Claude / Anthropic",
    description: "Claude con Messages API nativa para texto, herramientas y visión.",
    protocol: "anthropic-messages",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    capabilities: ["text", "tools", "vision"],
  },
  {
    id: "gemini",
    label: "Gemini / Google",
    description: "Gemini con la API generateContent nativa de Google.",
    protocol: "gemini-generate-content",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    capabilities: ["text", "tools", "vision"],
  },
  {
    id: "xai",
    label: "Grok / xAI",
    description: "Grok mediante el contrato OpenAI compatible de xAI.",
    protocol: "openai-compatible",
    defaultBaseUrl: "https://api.x.ai/v1",
    capabilities: ["text", "tools", "vision"],
  },
  {
    id: "qwen",
    label: "Qwen / DashScope",
    description: "Qwen usando el endpoint compatible de DashScope.",
    protocol: "openai-compatible",
    defaultBaseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    capabilities: ["text", "tools", "vision"],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    description: "Acceso a múltiples modelos mediante una sola API compatible.",
    protocol: "openai-compatible",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    capabilities: ["text", "tools", "vision"],
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    description: "DeepSeek para texto y herramientas; sus modelos no incluyen visión aquí.",
    protocol: "openai-compatible",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    capabilities: ["text", "tools"],
  },
  {
    id: "openai-compatible",
    label: "OpenAI compatible / personalizado",
    description: "Para gateways propios y proveedores compatibles con Chat Completions.",
    protocol: "openai-compatible",
    defaultBaseUrl: "https://api.openai.com/v1",
    capabilities: ["text", "tools", "vision", "image-generation"],
  },
];

export function getAiProvider(provider?: string | null): AiProviderDefinition {
  const value = (provider || "openai-compatible").trim().toLowerCase();
  return AI_PROVIDERS.find((item) => item.id === value)
    || AI_PROVIDERS.find((item) => item.id === "openai-compatible")!;
}

export function aiProviderSupports(provider: string | null | undefined, capability: AiCapability): boolean {
  return getAiProvider(provider).capabilities.includes(capability);
}
