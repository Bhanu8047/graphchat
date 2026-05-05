import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisVectorService } from '@graphchat/vector-client';
import { getEmbedding } from '@graphchat/ai';
import { VectorSearchResult } from '@graphchat/shared-types';
import { AiResolverService } from '../ai-resolver/ai-resolver.service';
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

  constructor(
    _cfg: ConfigService,
    private readonly resolver: AiResolverService,
  ) {
    this.redis = new RedisVectorService();
  }

  async onModuleInit() {
    await this.redis.connect();
  }

  async search(
    dto: SearchQueryDto,
    ownerId: string,
  ): Promise<VectorSearchResult[]> {
    await this.resolver.enforceRateLimit(ownerId, 'embedding');
    const embedCfg = await this.resolver.resolveEmbeddingConfig(ownerId);

    const cacheKey = buildSearchCacheKey({
      ownerId,
      q: dto.q,
      repoId: dto.repoId,
      type: dto.type,
      k: dto.k,
      budget: dto.budget,
      minConfidence: dto.minConfidence,
      provider: embedCfg.provider,
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
      embedding = await getEmbedding(dto.q, embedCfg);
    } catch (err) {
      this.logger.error(
        `Embedding failed for query "${dto.q.slice(0, 80)}"`,
        (err as Error).stack,
      );
      throw new ServiceUnavailableException(
        'Embedding provider is currently unavailable. Please try again.',
      );
    }

    void this.resolver.recordUsage(
      ownerId,
      'embedding',
      embedCfg.provider,
      embedCfg.model,
    );

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
