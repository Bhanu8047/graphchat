import OpenAI from 'openai';
import { EmbeddingConfig } from '../types';

export async function openaiEmbed(
  texts: string[],
  cfg: EmbeddingConfig,
): Promise<number[][]> {
  const client = new OpenAI({ apiKey: cfg.openaiApiKey });
  const res = await client.embeddings.create({
    model: cfg.openaiEmbedModel ?? 'text-embedding-3-small',
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}
