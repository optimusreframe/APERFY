import { describe, expect, it } from 'vitest';
import { getAiProvider, normalizeAiModel } from './ai-providers';

describe('AI provider model compatibility', () => {
  it('uses a current Claude model when the legacy Sonnet 5.5 alias is selected', () => {
    expect(normalizeAiModel('anthropic', 'claude-sonnet-5-5')).toBe('claude-sonnet-5');
    expect(normalizeAiModel('anthropic', 'claude-sonnet-5.5')).toBe('claude-sonnet-5');
  });

  it('offers a valid Claude default in the setup assistant', () => {
    expect(getAiProvider('anthropic').modelPlaceholder).toBe('claude-sonnet-5');
  });
});
