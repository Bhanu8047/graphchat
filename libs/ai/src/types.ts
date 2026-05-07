import type {
  EmbeddingProvider,
  LLMProvider,
  SuggestResult,
} from '@graphchat/shared-types';

export type VoyageModel =
  | 'voyage-code-3'
  | 'voyage-3'
  | 'voyage-3-large'
  | 'voyage-3-lite';

export interface EmbeddingConfig {
  provider: EmbeddingProvider;
  voyageApiKey?: string;
  voyageBaseUrl?: string;
  voyageModel?: VoyageModel;
  openaiApiKey?: string;
  openaiEmbedModel?: string;
  geminiApiKey?: string;
  geminiEmbedModel?: string;
  ollamaBaseUrl?: string;
  ollamaEmbedModel?: string;
}

export interface LLMConfig {
  provider: LLMProvider;
  anthropicApiKey?: string;
  claudeModel?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  geminiApiKey?: string;
  geminiModel?: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  openrouterApiKey?: string;
  openrouterModel?: string;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export interface LLMResponse<T> {
  result: T;
  usage: Usage;
  model: string;
}

/**
 * `provider` is 'lexical' when the embedding service falls back to the
 * deterministic in-process embedder (no remote call) — callers should skip
 * quota recording in that case.
 */
export interface EmbeddingResponse {
  vectors: number[][];
  usage: Usage;
  provider: EmbeddingProvider | 'lexical';
  model: string;
}

export type { EmbeddingProvider, LLMProvider, SuggestResult };
