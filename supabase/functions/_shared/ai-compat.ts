type AiProviderConfig = {
  provider?: string | null;
  baseUrl?: string | null;
};

export function isDeepSeekProvider(config: AiProviderConfig): boolean {
  const provider = `${config.provider ?? ''} ${config.baseUrl ?? ''}`.toLowerCase();
  return provider.includes('deepseek');
}

export const DEEPSEEK_IMAGE_LIMITATION =
  'DeepSeek V4 funciona para texto y tool calls, pero no admite entrada de imágenes ni generación de imágenes. Configura un proveedor con visión/imagen o usa una imagen original subida manualmente.';

export function buildAiRequestBody<T extends Record<string, unknown>>(
  config: AiProviderConfig,
  body: T,
): T & { thinking?: { type: 'disabled' } } {
  const usesToolCalls = Object.prototype.hasOwnProperty.call(body, 'tools') || Object.prototype.hasOwnProperty.call(body, 'tool_choice');

  if (!isDeepSeekProvider(config) || !usesToolCalls) return body;

  return { ...body, thinking: { type: 'disabled' } };
}
