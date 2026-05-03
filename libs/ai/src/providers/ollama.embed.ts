import OpenAI from 'openai';
import { EmbeddingConfig } from '../types';

export async function ollamaEmbed(
  texts: string[],
  cfg: EmbeddingConfig,
): Promise<number[][]> {
  const client = new OpenAI({
    apiKey: 'ollama',
    baseURL: `${cfg.ollamaBaseUrl ?? 'http://localhost:11434'}/v1`,
  });
  const res = await client.embeddings.create({
    model: cfg.ollamaEmbedModel ?? 'nomic-embed-text',
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}
