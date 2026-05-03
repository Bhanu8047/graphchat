import OpenAI from 'openai';
import { EmbeddingConfig } from '../types';

export async function voyageEmbed(
  texts: string[],
  cfg: EmbeddingConfig,
): Promise<number[][]> {
  const client = new OpenAI({
    apiKey: cfg.voyageApiKey,
    baseURL: cfg.voyageBaseUrl ?? 'https://api.voyageai.com/v1',
  });
  const res = await client.embeddings.create({
    model: cfg.voyageModel ?? 'voyage-code-3',
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}
