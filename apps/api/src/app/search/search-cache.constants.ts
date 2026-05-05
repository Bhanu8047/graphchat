import { createHash } from 'node:crypto';

/**
 * Centralized cache key/tag definitions for the semantic search feature.
 *
 * Goals:
 *  - Single source of truth for every Redis key namespace touched by search.
 *  - Stable, collision-free keys derived from a normalized query payload.
 *  - Tag-based invalidation so writers (node create/update/delete) can flush
 *    only the slice they affect (per-owner / per-repo) without scanning.
 */
export const SEARCH_CACHE = {
  /** Key prefix for cached search result payloads. */
  PREFIX: 'cache:search',
  /** Default TTL in seconds for a cached search response. */
  DEFAULT_TTL_SECONDS: 60,
  /** Tag namespaces — used to group keys for bulk invalidation. */
  TAGS: {
    /** All search cache entries. */
    ALL: 'cache:tag:search:all',
    /** All search cache entries for a given owner. */
    owner: (ownerId: string) => `cache:tag:search:owner:${ownerId}`,
    /** All search cache entries scoped to a specific repo. */
    repo: (repoId: string) => `cache:tag:search:repo:${repoId}`,
  },
} as const;

export interface SearchCacheKeyParams {
  ownerId: string;
  q: string;
  repoId?: string;
  type?: string;
  k?: number;
  budget?: number;
  minConfidence?: string;
  /** Embedding provider — different providers produce different vectors. */
  provider?: string;
}

/**
 * Build a deterministic cache key for a semantic search request.
 *
 * The query string is normalized (trim + lowercase) and every parameter that
 * influences the result set is folded into a stable JSON payload, which is
 * then SHA-256 hashed. This guarantees:
 *  - Same effective query → same key (cache hit).
 *  - Any meaningful parameter change → different key (no stale collisions).
 *  - Bounded length, safe Redis key (no special chars from user input).
 */
export function buildSearchCacheKey(params: SearchCacheKeyParams): string {
  const normalized = {
    o: params.ownerId,
    q: params.q.trim().toLowerCase(),
    r: params.repoId ?? '',
    t: params.type ?? '',
    k: params.k ?? 10,
    b: params.budget ?? 0,
    c: params.minConfidence ?? '',
    p: params.provider ?? '',
  };
  const hash = createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest('hex')
    .slice(0, 24);
  return `${SEARCH_CACHE.PREFIX}:${hash}`;
}

/**
 * Build the set of tags a cache entry should be associated with so it can be
 * invalidated when underlying data changes.
 */
export function buildSearchCacheTags(params: {
  ownerId: string;
  repoId?: string;
}): string[] {
  const tags: string[] = [
    SEARCH_CACHE.TAGS.ALL,
    SEARCH_CACHE.TAGS.owner(params.ownerId),
  ];
  if (params.repoId) tags.push(SEARCH_CACHE.TAGS.repo(params.repoId));
  return tags;
}
