import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisVectorService } from '@vectorgraph/vector-client';
import { getEmbedding, EmbeddingConfig } from '@vectorgraph/ai';
import {
  VectorSearchResult,
  EmbeddingProvider,
} from '@vectorgraph/shared-types';
import { RuntimeConfigService } from '../runtime/runtime-config.service';
import { SearchQueryDto } from './dto/search-query.dto';
import {
  SEARCH_CACHE,
  buildSearchCacheKey,
  buildSearchCacheTags,
} from './search-cache.constants';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private redis: RedisVectorService;
  private embedCfg: EmbeddingConfig;

  constructor(
    cfg: ConfigService,
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

  /**
   * Run a semantic search.
   *
   * Defensive layout (each step isolated so a failure in one does not surface
   * as an opaque 500):
   *   1. Cache lookup — never fatal; failures are logged and ignored.
   *   2. Embedding   — provider outage → 503 ServiceUnavailable.
   *   3. Vector KNN  — backend error  → 500 with logged stack.
   *   4. Cache write — fire-and-forget; failures are logged and ignored.
   */
  async search(
    dto: SearchQueryDto,
    ownerId: string,
  ): Promise<VectorSearchResult[]> {
    const cacheKey = buildSearchCacheKey({
      ownerId,
      q: dto.q,
      repoId: dto.repoId,
      type: dto.type,
      k: dto.k,
      budget: dto.budget,
      minConfidence: dto.minConfidence,
      provider: this.embedCfg.provider,
    });
    const cacheTags = buildSearchCacheTags({
      ownerId,
      repoId: dto.repoId,
    });

    // 1. Cache read
    try {
      const cached = await this.redis.cacheGet<VectorSearchResult[]>(cacheKey);
      if (cached) return cached;
    } catch (err) {
      this.logger.warn(
        `Search cache read failed (${cacheKey}): ${(err as Error).message}`,
      );
    }

    // 2. Embedding
    let embedding: number[];
    try {
      embedding = await getEmbedding(dto.q, this.embedCfg);
    } catch (err) {
      this.logger.error(
        `Embedding failed for query "${dto.q.slice(0, 80)}"`,
        (err as Error).stack,
      );
      throw new ServiceUnavailableException(
        'Embedding provider is currently unavailable. Please try again.',
      );
    }

    // 3. Vector KNN
    let results: VectorSearchResult[];
    try {
      const raw = await this.redis.search(embedding, {
        ownerId,
        repoId: dto.repoId,
        type: dto.type,
        k: dto.k ?? 10,
        budget: dto.budget,
        minConfidence: dto.minConfidence,
      });
      results = raw.map((r) => ({
        node: r.node,
        repoId: r.node.repoId,
        score: r.score,
      }));
    } catch (err) {
      const e = err as Error;
      this.logger.error(
        `Vector search failed for owner ${ownerId}: ${e.message}`,
        e.stack,
      );
      throw new InternalServerErrorException(
        'Search backend error. Please retry shortly.',
      );
    }

    // 4. Cache write (non-blocking)
    void this.redis
      .cacheSet(cacheKey, results, SEARCH_CACHE.DEFAULT_TTL_SECONDS, cacheTags)
      .catch((err) =>
        this.logger.warn(`Search cache write failed: ${err.message}`),
      );

    return results;
  }

  /**
   * Invalidate cached search results when underlying data changes.
   * Callers (node create/update/delete pipelines) should invoke this with the
   * relevant scope so stale results never surface.
   */
  async invalidateCache(scope: {
    ownerId?: string;
    repoId?: string;
    all?: boolean;
  }): Promise<void> {
    const tags: string[] = [];
    if (scope.all) tags.push(SEARCH_CACHE.TAGS.ALL);
    if (scope.ownerId) tags.push(SEARCH_CACHE.TAGS.owner(scope.ownerId));
    if (scope.repoId) tags.push(SEARCH_CACHE.TAGS.repo(scope.repoId));
    if (!tags.length) return;
    try {
      await this.redis.cacheInvalidateTags(tags);
    } catch (err) {
      this.logger.warn(
        `Search cache invalidation failed: ${(err as Error).message}`,
      );
    }
  }
}
