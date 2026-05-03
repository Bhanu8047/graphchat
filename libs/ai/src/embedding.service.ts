import { EmbeddingConfig } from './types';
import { voyageEmbed } from './providers/voyage.embed';
import { openaiEmbed } from './providers/openai.embed';
import { geminiEmbed } from './providers/gemini.embed';
import { ollamaEmbed } from './providers/ollama.embed';

export async function getEmbedding(text: string, cfg: EmbeddingConfig): Promise<number[]> {
  const [v] = await getEmbeddings([text], cfg);
  return v;
}

export async function getEmbeddings(texts: string[], cfg: EmbeddingConfig): Promise<number[][]> {
  switch (cfg.provider) {
    case 'voyage': return voyageEmbed(texts, cfg);
    case 'openai': return openaiEmbed(texts, cfg);
    case 'gemini': return geminiEmbed(texts, cfg);
    case 'ollama': return ollamaEmbed(texts, cfg);
    default: throw new Error(`Unknown embedding provider: ${cfg.provider}`);
  }
}
