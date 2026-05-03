import OpenAI from 'openai';
import { LLMConfig, SuggestResult } from '../types';
import { buildPrompt, parseJSON } from './_shared';

export async function ollamaSuggest(
  repoName: string,
  input: string,
  cfg: LLMConfig,
): Promise<SuggestResult> {
  const isOpenRouter = cfg.provider === 'openrouter';
  const client = new OpenAI({
    apiKey: isOpenRouter ? cfg.openrouterApiKey : 'ollama',
    baseURL: isOpenRouter
      ? 'https://openrouter.ai/api/v1'
      : `${cfg.ollamaBaseUrl ?? 'http://localhost:11434'}/v1`,
  });
  const res = await client.chat.completions.create({
    model: isOpenRouter
      ? (cfg.openrouterModel ?? 'meta-llama/llama-3.1-8b-instruct:free')
      : (cfg.ollamaModel ?? 'llama3.2'),
    messages: [{ role: 'user', content: buildPrompt(repoName, input) }],
  });
  return parseJSON(res.choices[0].message.content!);
}
