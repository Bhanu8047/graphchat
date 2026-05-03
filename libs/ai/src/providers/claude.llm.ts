import Anthropic from '@anthropic-ai/sdk';
import { LLMConfig, SuggestResult } from '../types';
import { buildPrompt, parseJSON } from './_shared';

export async function claudeSuggest(
  repoName: string,
  input: string,
  cfg: LLMConfig,
): Promise<SuggestResult> {
  const client = new Anthropic({ apiKey: cfg.anthropicApiKey });
  const msg = await client.messages.create({
    model: cfg.claudeModel ?? 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: buildPrompt(repoName, input) }],
  });
  return parseJSON(
    msg.content.map((c) => (c.type === 'text' ? c.text : '')).join(''),
  );
}
