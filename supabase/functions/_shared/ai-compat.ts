type AiProviderConfig = {
  provider?: string | null;
  baseUrl?: string | null;
};

export function buildAiRequestBody<T extends Record<string, unknown>>(
  config: AiProviderConfig,
  body: T,
): T & { thinking?: { type: 'disabled' } } {
  const provider = `${config.provider ?? ''} ${config.baseUrl ?? ''}`.toLowerCase();
  const usesToolCalls = Object.prototype.hasOwnProperty.call(body, 'tools') || Object.prototype.hasOwnProperty.call(body, 'tool_choice');

  if (!provider.includes('deepseek') || !usesToolCalls) return body;

  return { ...body, thinking: { type: 'disabled' } };
}
