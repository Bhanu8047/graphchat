import { GoogleGenerativeAI } from '@google/generative-ai';
import { EmbeddingConfig, Usage } from '../types';

export async function geminiEmbed(
  texts: string[],
  cfg: EmbeddingConfig,
): Promise<{ vectors: number[][]; usage: Usage; model: string }> {
  const genAI = new GoogleGenerativeAI(cfg.geminiApiKey!);
  const modelId = cfg.geminiEmbedModel ?? 'text-embedding-004';
  const model = genAI.getGenerativeModel({ model: modelId });
  const results = await Promise.all(texts.map((t) => model.embedContent(t)));
  // Gemini's embedContent does not return token counts — estimate.
  return {
    vectors: results.map((r) => r.embedding.values),
    usage: {
      inputTokens: Math.ceil(texts.reduce((n, t) => n + t.length, 0) / 4),
      outputTokens: 0,
    },
    model: modelId,
  };
}
