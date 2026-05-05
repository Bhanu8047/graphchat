import type {
  EmbeddingProvider,
  LLMProvider,
  SuggestResult,
} from '@trchat/shared-types';

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

export type { EmbeddingProvider, LLMProvider, SuggestResult };
