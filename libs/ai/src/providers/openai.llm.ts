import OpenAI from 'openai';
import { LLMConfig, LLMResponse, SuggestResult } from '../types';
import { buildPrompt } from './_shared';

export async function openaiSuggest(
  repoName: string,
  input: string,
  cfg: LLMConfig,
): Promise<LLMResponse<SuggestResult>> {
  const client = new OpenAI({ apiKey: cfg.openaiApiKey });
  const model = cfg.openaiModel ?? 'gpt-4o-mini';
  const res = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: buildPrompt(repoName, input) }],
    response_format: { type: 'json_object' },
  });
  const result = JSON.parse(res.choices[0].message.content!) as SuggestResult;
  return {
    result,
    usage: {
      inputTokens: res.usage?.prompt_tokens ?? 0,
      outputTokens: res.usage?.completion_tokens ?? 0,
    },
    model,
  };
}
