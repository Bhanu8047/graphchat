import OpenAI from 'openai';
import { EmbeddingConfig, Usage } from '../types';

export async function ollamaEmbed(
  texts: string[],
  cfg: EmbeddingConfig,
): Promise<{ vectors: number[][]; usage: Usage; model: string }> {
  const client = new OpenAI({
    apiKey: 'ollama',
    baseURL: `${cfg.ollamaBaseUrl ?? 'http://localhost:11434'}/v1`,
  });
  const model = cfg.ollamaEmbedModel ?? 'nomic-embed-text';
  const res = await client.embeddings.create({ model, input: texts });
  return {
    vectors: res.data.map((d) => d.embedding),
    usage: {
      inputTokens:
        res.usage?.prompt_tokens ??
        Math.ceil(texts.reduce((n, t) => n + t.length, 0) / 4),
      outputTokens: 0,
    },
    model,
  };
}
