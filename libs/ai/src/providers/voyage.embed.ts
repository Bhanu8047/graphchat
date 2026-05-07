import OpenAI from 'openai';
import { EmbeddingConfig, Usage } from '../types';

export async function voyageEmbed(
  texts: string[],
  cfg: EmbeddingConfig,
): Promise<{ vectors: number[][]; usage: Usage; model: string }> {
  const client = new OpenAI({
    apiKey: cfg.voyageApiKey,
    baseURL: cfg.voyageBaseUrl ?? 'https://api.voyageai.com/v1',
  });
  const model = cfg.voyageModel ?? 'voyage-code-3';
  const res = await client.embeddings.create({ model, input: texts });
  return {
    vectors: res.data.map((d) => d.embedding),
    usage: {
      inputTokens: res.usage?.prompt_tokens ?? estimateTokens(texts),
      outputTokens: 0,
    },
    model,
  };
}

function estimateTokens(texts: string[]): number {
  return Math.ceil(texts.reduce((n, t) => n + t.length, 0) / 4);
}
