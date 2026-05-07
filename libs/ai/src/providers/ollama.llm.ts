import OpenAI from 'openai';
import { LLMConfig, LLMResponse, SuggestResult } from '../types';
import { buildPrompt, parseJSON } from './_shared';

export async function ollamaSuggest(
  repoName: string,
  input: string,
  cfg: LLMConfig,
): Promise<LLMResponse<SuggestResult>> {
  const isOpenRouter = cfg.provider === 'openrouter';
  const client = new OpenAI({
    apiKey: isOpenRouter ? cfg.openrouterApiKey : 'ollama',
    baseURL: isOpenRouter
      ? 'https://openrouter.ai/api/v1'
      : `${cfg.ollamaBaseUrl ?? 'http://localhost:11434'}/v1`,
  });
  const model = isOpenRouter
    ? (cfg.openrouterModel ?? 'meta-llama/llama-3.1-8b-instruct:free')
    : (cfg.ollamaModel ?? 'llama3.2');
  const res = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: buildPrompt(repoName, input) }],
  });
  const result = parseJSON(res.choices[0].message.content!);
  return {
    result,
    usage: {
      inputTokens: res.usage?.prompt_tokens ?? 0,
      outputTokens: res.usage?.completion_tokens ?? 0,
    },
    model,
  };
}
