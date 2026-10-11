export type AiProtocol = "openai-compatible" | "anthropic-messages" | "gemini-generate-content";
export type AiCapability = "text" | "tools" | "vision" | "image-generation";

export interface AiProviderTutorialStep {
  title: string;
  body: string;
}

export interface AiProviderDefinition {
  id: string;
  label: string;
  description: string;
  protocol: AiProtocol;
  defaultBaseUrl: string;
  docsUrl: string;
  keyUrl: string;
  modelPlaceholder: string;
  imageModelPlaceholder?: string;
  modelExamples: string[];
  capabilities: AiCapability[];
  tutorial: AiProviderTutorialStep[];
}

export const AI_PROVIDERS: AiProviderDefinition[] = [
  {
    id: "openai",
    label: "GPT / OpenAI",
    description: "Modelos GPT para extracción, herramientas, visión y generación de imágenes nativa.",
    protocol: "openai-compatible",
    defaultBaseUrl: "https://api.openai.com/v1",
    docsUrl: "https://platform.openai.com/docs/overview",
    keyUrl: "https://platform.openai.com/api-keys",
    modelPlaceholder: "gpt-4o-mini",
    imageModelPlaceholder: "gpt-image-1",
    modelExamples: ["gpt-4o-mini", "gpt-4.1-mini"],
    capabilities: ["text", "tools", "vision", "image-generation"],
    tutorial: [
      { title: "Crea el proyecto", body: "Entra a la plataforma de OpenAI, crea o selecciona un proyecto y abre API keys." },
      { title: "Genera la clave", body: "Crea una secret key y cópiala una sola vez. Guárdala en Integrations; APERFY nunca la muestra de vuelta." },
      { title: "Elige el modelo", body: "Después de guardar la clave, APERFY cargará los modelos disponibles para que elijas uno sin escribir su ID." },
    ],
  },
  {
    id: "anthropic",
    label: "Claude / Anthropic",
    description: "Claude con Messages API nativa para texto, herramientas y visión. No genera imágenes en esta integración.",
    protocol: "anthropic-messages",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    docsUrl: "https://docs.anthropic.com/en/api/messages",
    keyUrl: "https://console.anthropic.com/settings/keys",
    modelPlaceholder: "claude-sonnet-5",
    modelExamples: ["claude-sonnet-5", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
    capabilities: ["text", "tools", "vision"],
    tutorial: [
      { title: "Abre Console", body: "En la consola de Anthropic entra a Settings → API keys. Es posible que primero debas configurar billing." },
      { title: "Copia la clave", body: "Crea una API key, cópiala y pégala en AI provider API key dentro de Integrations." },
      { title: "Selecciona el modelo", body: "Elige un modelo Claude disponible en tu cuenta. APERFY usa Messages API nativa; no necesitas convertirlo a OpenAI." },
    ],
  },
  {
    id: "gemini",
    label: "Gemini / Google",
    description: "Gemini con generateContent nativo para texto, herramientas, visión e imágenes Nano Banana.",
    protocol: "gemini-generate-content",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    docsUrl: "https://ai.google.dev/gemini-api/docs",
    keyUrl: "https://aistudio.google.com/app/apikey",
    modelPlaceholder: "gemini-2.5-flash",
    imageModelPlaceholder: "gemini-3.1-flash-image",
    modelExamples: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-3.1-flash-image"],
    capabilities: ["text", "tools", "vision", "image-generation"],
    tutorial: [
      { title: "Abre Google AI Studio", body: "En AI Studio entra a Get API key y selecciona un proyecto de Google Cloud." },
      { title: "Genera la clave", body: "Crea una API key y guárdala en Integrations. Gemini se autentica de forma segura en el servidor." },
      { title: "Selecciona el modelo", body: "Después de guardar la clave, APERFY cargará los modelos habilitados en tu proyecto y los ordenará del más reciente al más antiguo." },
    ],
  },
  {
    id: "xai",
    label: "Grok / xAI",
    description: "Grok mediante el endpoint OpenAI compatible de xAI.",
    protocol: "openai-compatible",
    defaultBaseUrl: "https://api.x.ai/v1",
    docsUrl: "https://docs.x.ai/docs",
    keyUrl: "https://console.x.ai/",
    modelPlaceholder: "grok-3-mini",
    modelExamples: ["grok-3-mini", "grok-3"],
    capabilities: ["text", "tools", "vision"],
    tutorial: [
      { title: "Abre xAI Console", body: "Crea un proyecto en la consola de xAI y entra a la sección API keys." },
      { title: "Crea la clave", body: "Genera una clave para el proyecto y pégala en Integrations." },
      { title: "Confirma el modelo", body: "La lista se actualiza desde xAI y solo muestra los modelos disponibles para tu clave. El base URL ya está preconfigurado." },
    ],
  },
  {
    id: "qwen",
    label: "Qwen / DashScope",
    description: "Qwen usando el modo compatible de DashScope.",
    protocol: "openai-compatible",
    defaultBaseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    docsUrl: "https://www.alibabacloud.com/help/en/model-studio/",
    keyUrl: "https://bailian.console.aliyun.com/",
    modelPlaceholder: "qwen-plus",
    modelExamples: ["qwen-plus", "qwen-max"],
    capabilities: ["text", "tools", "vision"],
    tutorial: [
      { title: "Abre Model Studio", body: "En Alibaba Cloud Model Studio selecciona la región y el workspace donde usarás Qwen." },
      { title: "Crea una API key", body: "Genera una key en la sección de credenciales y pégala en Integrations." },
      { title: "Revisa la región", body: "El base URL internacional viene precargado. Si tu cuenta usa otra región, reemplázalo por el endpoint compatible correspondiente." },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    description: "Gateway multi-proveedor para texto, herramientas, visión y generación nativa de imágenes.",
    protocol: "openai-compatible",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    docsUrl: "https://openrouter.ai/docs",
    keyUrl: "https://openrouter.ai/keys",
    modelPlaceholder: "anthropic/claude-sonnet-4.6",
    imageModelPlaceholder: "openai/gpt-image-1",
    modelExamples: ["anthropic/claude-sonnet-4.6", "google/gemini-2.5-flash", "openai/gpt-image-1"],
    capabilities: ["text", "tools", "vision", "image-generation"],
    tutorial: [
      { title: "Crea una key", body: "En OpenRouter abre Keys, crea una clave y define límites de gasto para controlar el presupuesto." },
      { title: "Pega la clave una vez por grupo", body: "Puedes reutilizar la misma clave para texto, visión e imágenes. APERFY la guarda en Vault y nunca la expone." },
      { title: "Elige el modelo exacto", body: "APERFY consulta el catálogo de OpenRouter. Para imágenes solo muestra modelos con salida image; para texto y visión filtra sus modalidades automáticamente." },
    ],
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    description: "DeepSeek para texto y herramientas; no es proveedor de visión en APERFY.",
    protocol: "openai-compatible",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    docsUrl: "https://api-docs.deepseek.com/",
    keyUrl: "https://platform.deepseek.com/api_keys",
    modelPlaceholder: "deepseek-chat",
    modelExamples: ["deepseek-chat", "deepseek-reasoner"],
    capabilities: ["text", "tools"],
    tutorial: [
      { title: "Abre DeepSeek Platform", body: "Entra a API keys y revisa que tu cuenta tenga crédito disponible." },
      { title: "Crea la clave", body: "Genera la clave y pégala en Integrations. Nunca la coloques en el navegador." },
      { title: "Usa texto", body: "DeepSeek se puede usar para extracción, traducción y copy; selecciona un proveedor de visión aparte para fotos." },
    ],
  },
  {
    id: "openai-compatible",
    label: "OpenAI compatible / personalizado",
    description: "Para gateways propios y cualquier proveedor compatible con Chat Completions.",
    protocol: "openai-compatible",
    defaultBaseUrl: "https://api.openai.com/v1",
    docsUrl: "",
    keyUrl: "",
    modelPlaceholder: "nombre-del-modelo",
    modelExamples: [],
    capabilities: ["text", "tools", "vision", "image-generation"],
    tutorial: [
      { title: "Consulta tu proveedor", body: "Busca en la documentación del gateway la API key, el base URL y el model ID exacto." },
      { title: "Guarda la credencial", body: "Pega la API key en Integrations y usa el base URL completo terminado en /v1 cuando corresponda." },
      { title: "Prueba una acción", body: "Guarda la configuración y prueba extracción de producto antes de activar funciones de imagen." },
    ],
  },
];

export function getAiProvider(provider?: string | null): AiProviderDefinition {
  const value = (provider || "openai-compatible").trim().toLowerCase();
  return AI_PROVIDERS.find((item) => item.id === value)
    || AI_PROVIDERS.find((item) => item.id === "openai-compatible")!;
}

/**
 * Keep known legacy model aliases working after a provider retires or renames
 * a model. Custom provider model IDs are intentionally left untouched.
 */
export function normalizeAiModel(provider: string | null | undefined, model: string | null | undefined): string {
  const value = (model || '').trim();
  if ((provider || '').trim().toLowerCase() === 'anthropic' && /^claude-sonnet-5(?:[-.]5)$/i.test(value)) {
    return 'claude-sonnet-5';
  }
  return value;
}
