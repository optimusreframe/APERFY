import { describe, expect, it } from 'vitest';
import { buildAiRequestBody, isDeepSeekProvider } from '../../supabase/functions/_shared/ai-compat';

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
});
