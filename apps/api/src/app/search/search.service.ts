import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisVectorService } from '@vectorgraph/vector-client';
import { getEmbedding, EmbeddingConfig } from '@vectorgraph/ai';
import { SearchQueryDto, VectorSearchResult, EmbeddingProvider } from '@vectorgraph/shared-types';

@Injectable()
export class SearchService implements OnModuleInit {
  private redis: RedisVectorService;
  private embedCfg: EmbeddingConfig;

  constructor(private cfg: ConfigService) {
    this.redis = new RedisVectorService();
    this.embedCfg = {
      provider:      cfg.get<EmbeddingProvider>('EMBEDDING_PROVIDER', 'voyage'),
      voyageApiKey:  cfg.get('VOYAGE_API_KEY'),
      voyageModel:   cfg.get('VOYAGE_MODEL', 'voyage-code-3') as any,
      openaiApiKey:  cfg.get('OPENAI_API_KEY'),
      geminiApiKey:  cfg.get('GEMINI_API_KEY'),
      ollamaBaseUrl: cfg.get('OLLAMA_BASE_URL'),
      ollamaEmbedModel: cfg.get('OLLAMA_EMBED_MODEL'),
    };
  }

  async onModuleInit() { await this.redis.connect(); }

  async search(dto: SearchQueryDto): Promise<VectorSearchResult[]> {
    const embedding = await getEmbedding(dto.q, this.embedCfg);
    const results = await this.redis.search(embedding, {
      repoId: dto.repoId,
      type:   dto.type,
      k:      dto.k ?? 10,
    });
    return results.map(r => ({
      node:   r.node,
      repoId: r.node.repoId,
      score:  r.score,
    }));
  }
}
