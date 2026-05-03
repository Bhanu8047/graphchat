import { GoogleGenerativeAI } from '@google/generative-ai';
import { EmbeddingConfig } from '../types';

export async function geminiEmbed(texts: string[], cfg: EmbeddingConfig): Promise<number[][]> {
  const genAI = new GoogleGenerativeAI(cfg.geminiApiKey!);
  const model = genAI.getGenerativeModel({ model: cfg.geminiEmbedModel ?? 'text-embedding-004' });
  const results = await Promise.all(texts.map(t => model.embedContent(t)));
  return results.map(r => r.embedding.values);
}
