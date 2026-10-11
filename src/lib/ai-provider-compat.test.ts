import { describe, expect, it } from 'vitest';
import { buildAiRequestBody, isDeepSeekProvider, isImageGenerationProviderUsable, isImageProviderUsable } from '../../supabase/functions/_shared/ai-compat';

describe('buildAiRequestBody', () => {
  it('disables DeepSeek thinking when a request uses tool calls', () => {
    const body = buildAiRequestBody(
      { provider: 'deepseek', baseUrl: 'https://api.deepseek.com' },
      { model: 'deepseek-v4-flash', tools: [{ type: 'function' }], tool_choice: { type: 'function' } },
    );

    expect(body.thinking).toEqual({ type: 'disabled' });
  });

  it('does not alter tool-call payloads for other OpenAI-compatible providers', () => {
    const payload = { model: 'gpt-4o-mini', tools: [{ type: 'function' }] };

    expect(buildAiRequestBody({ provider: 'openai', baseUrl: 'https://api.openai.com/v1' }, payload)).toEqual(payload);
  });

  it('recognizes DeepSeek by provider or compatible base URL', () => {
    expect(isDeepSeekProvider({ provider: 'deepseek' })).toBe(true);
    expect(isDeepSeekProvider({ baseUrl: 'https://api.deepseek.com' })).toBe(true);
    expect(isDeepSeekProvider({ provider: 'openai', baseUrl: 'https://api.openai.com/v1' })).toBe(false);
  });

  it('requires a separate non-DeepSeek provider for image capabilities', () => {
    expect(isImageProviderUsable({ apiKey: 'sk-deepseek', provider: 'deepseek', model: 'deepseek-v4-flash' })).toBe(false);
    expect(isImageProviderUsable({ apiKey: 'sk-image', provider: 'openai-compatible', model: 'vision-image-model' })).toBe(true);
    expect(isImageProviderUsable({ apiKey: '', provider: 'openai-compatible', model: 'vision-image-model' })).toBe(false);
    expect(isImageProviderUsable({ apiKey: 'sk-gemini', provider: 'gemini', model: 'gemini-2.5-flash' })).toBe(true);
    expect(isImageProviderUsable({ apiKey: 'sk-unknown', provider: 'unknown-gateway', model: 'vision-model' })).toBe(true);
  });

  it('only enables image generation for providers that declare that capability', () => {
    expect(isImageGenerationProviderUsable({ apiKey: 'sk-openai', provider: 'openai', model: 'gpt-image-1' })).toBe(true);
    expect(isImageGenerationProviderUsable({ apiKey: 'sk-gemini', provider: 'gemini', model: 'gemini-3.1-flash-image' })).toBe(true);
    expect(isImageGenerationProviderUsable({ apiKey: 'sk-openrouter', provider: 'openrouter', model: 'openai/gpt-image-1' })).toBe(true);
    expect(isImageGenerationProviderUsable({ apiKey: 'sk-claude', provider: 'anthropic', model: 'claude-sonnet-4-6' })).toBe(false);
    expect(isImageGenerationProviderUsable({ apiKey: 'sk-custom', provider: 'my-gateway', model: 'image-model' })).toBe(true);
  });
});
