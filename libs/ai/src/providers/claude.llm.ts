import Anthropic from '@anthropic-ai/sdk';
import { LLMConfig, LLMResponse, SuggestResult } from '../types';
import { buildPrompt, parseJSON } from './_shared';

export async function claudeSuggest(
  repoName: string,
  input: string,
  cfg: LLMConfig,
): Promise<LLMResponse<SuggestResult>> {
  const client = new Anthropic({ apiKey: cfg.anthropicApiKey });
  const model = cfg.claudeModel ?? 'claude-sonnet-4-5-20250929';
  const msg = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: 'user', content: buildPrompt(repoName, input) }],
  });
  const result = parseJSON(
    msg.content.map((c) => (c.type === 'text' ? c.text : '')).join(''),
  );
  return {
    result,
    usage: {
      inputTokens: msg.usage?.input_tokens ?? 0,
      outputTokens: msg.usage?.output_tokens ?? 0,
    },
    model,
  };
}
