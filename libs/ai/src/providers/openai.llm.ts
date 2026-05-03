import OpenAI from 'openai';
import { LLMConfig, SuggestResult } from '../types';
import { buildPrompt } from './_shared';

export async function openaiSuggest(
  repoName: string,
  input: string,
  cfg: LLMConfig,
): Promise<SuggestResult> {
  const client = new OpenAI({ apiKey: cfg.openaiApiKey });
  const res = await client.chat.completions.create({
    model: cfg.openaiModel ?? 'gpt-4o-mini',
    messages: [{ role: 'user', content: buildPrompt(repoName, input) }],
    response_format: { type: 'json_object' },
  });
  return JSON.parse(res.choices[0].message.content!);
}
