import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisVectorService } from '@vectorgraph/vector-client';
import { getEmbedding, EmbeddingConfig } from '@vectorgraph/ai';
import {
  SearchQueryDto,
  VectorSearchResult,
  EmbeddingProvider,
} from '@vectorgraph/shared-types';
import { RuntimeConfigService } from '../runtime/runtime-config.service';

@Injectable()
export class SearchService implements OnModuleInit {
  private redis: RedisVectorService;
  private embedCfg: EmbeddingConfig;

  constructor(
    private cfg: ConfigService,
    private runtimeConfig: RuntimeConfigService,
  ) {
    const defaultProvider =
      this.runtimeConfig.getDefaultEmbeddingProvider() ??
      cfg.get<EmbeddingProvider>('EMBEDDING_PROVIDER', 'gemini');
    this.redis = new RedisVectorService();
    this.embedCfg = {
      provider: defaultProvider,
      voyageApiKey: cfg.get('VOYAGE_API_KEY'),
      voyageBaseUrl: cfg.get('VOYAGE_BASE_URL'),
      voyageModel: cfg.get('VOYAGE_MODEL', 'voyage-code-3') as any,
      openaiApiKey: cfg.get('OPENAI_API_KEY'),
      geminiApiKey: cfg.get('GEMINI_API_KEY'),
      ollamaBaseUrl: cfg.get('OLLAMA_BASE_URL'),
      ollamaEmbedModel: cfg.get('OLLAMA_EMBED_MODEL'),
    };
  }

  async onModuleInit() {
    await this.redis.connect();
  }

  async search(
    dto: SearchQueryDto,
    ownerId: string,
  ): Promise<VectorSearchResult[]> {
    const embedding = await getEmbedding(dto.q, this.embedCfg);
    const results = await this.redis.search(embedding, {
      ownerId,
      repoId: dto.repoId,
      type: dto.type,
      k: dto.k ?? 10,
    });
    return results.map((r) => ({
      node: r.node,
      repoId: r.node.repoId,
      score: r.score,
    }));
  }
}
