import { VECTOR_DIMENSION } from '@graphchat/shared-types';
import { EmbeddingConfig, EmbeddingProvider } from './types';
import { voyageEmbed } from './providers/voyage.embed';
import { openaiEmbed } from './providers/openai.embed';
import { geminiEmbed } from './providers/gemini.embed';
import { ollamaEmbed } from './providers/ollama.embed';

const providerEmbedders: Record<
  EmbeddingProvider,
  (texts: string[], cfg: EmbeddingConfig) => Promise<number[][]>
> = {
  voyage: voyageEmbed,
  openai: openaiEmbed,
  gemini: geminiEmbed,
  ollama: ollamaEmbed,
};

const providerOrder: EmbeddingProvider[] = [
  'voyage',
  'openai',
  'gemini',
  'ollama',
];

export async function getEmbedding(
  text: string,
  cfg: EmbeddingConfig,
): Promise<number[]> {
  const [v] = await getEmbeddings([text], cfg);
  return v;
}

export async function getEmbeddings(
  texts: string[],
  cfg: EmbeddingConfig,
): Promise<number[][]> {
  const errors: string[] = [];

  for (const provider of getProviderFallbackOrder(cfg)) {
    try {
      const embeddings = await providerEmbedders[provider](texts, {
        ...cfg,
        provider,
      });
      return embeddings.map(normalizeEmbedding);
    } catch (error) {
      errors.push(`${provider}: ${formatError(error)}`);
    }
  }

  console.warn(
    `Falling back to local lexical embeddings. Providers failed: ${errors.join(' | ')}`,
  );
  return texts.map(buildLexicalFallbackEmbedding);
}

function getProviderFallbackOrder(cfg: EmbeddingConfig): EmbeddingProvider[] {
  const unique = [
    cfg.provider,
    ...providerOrder.filter((provider) => provider !== cfg.provider),
  ];
  return unique.filter((provider) => hasProviderConfig(provider, cfg));
}

function hasProviderConfig(
  provider: EmbeddingProvider,
  cfg: EmbeddingConfig,
): boolean {
  switch (provider) {
    case 'voyage':
      return Boolean(cfg.voyageApiKey);
    case 'openai':
      return Boolean(cfg.openaiApiKey);
    case 'gemini':
      return Boolean(cfg.geminiApiKey);
    case 'ollama':
      return Boolean(cfg.ollamaBaseUrl || cfg.provider === 'ollama');
    default:
      return false;
  }
}

function normalizeEmbedding(embedding: number[]): number[] {
  const normalized = new Array<number>(VECTOR_DIMENSION).fill(0);
  for (
    let index = 0;
    index < Math.min(embedding.length, VECTOR_DIMENSION);
    index += 1
  ) {
    normalized[index] = embedding[index];
  }

  return l2Normalize(normalized);
}

function buildLexicalFallbackEmbedding(text: string): number[] {
  const vector = new Array<number>(VECTOR_DIMENSION).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9_./:-]+/g) ?? [];

  for (const token of tokens) {
    const index = hashToken(token) % VECTOR_DIMENSION;
    vector[index] += 1;
  }

  return l2Normalize(vector);
}

function l2Normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(
    vector.reduce((sum, value) => sum + value * value, 0),
  );
  if (!magnitude) return vector;
  return vector.map((value) => value / magnitude);
}

function hashToken(token: string): number {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
