import { createClient, SchemaFieldTypes, VectorAlgorithms } from 'redis';
import {
  ContextNode,
  EdgeConfidence,
  VECTOR_DIMENSION,
} from '@trchat/shared-types';

export class RedisVectorService {
  private client = createClient({
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  });

  async connect(): Promise<void> {
    await this.client.connect();
    await this.ensureIndex();
  }

  private async ensureIndex(): Promise<void> {
    try {
      await this.client.ft.create(
        'idx:context',
        {
          '$.ownerId': { type: SchemaFieldTypes.TAG, AS: 'ownerId' },
          '$.repoId': { type: SchemaFieldTypes.TAG, AS: 'repoId' },
          '$.type': { type: SchemaFieldTypes.TAG, AS: 'type' },
          '$.confidence': { type: SchemaFieldTypes.TAG, AS: 'confidence' },
          '$.label': { type: SchemaFieldTypes.TEXT, AS: 'label' },
          '$.content': { type: SchemaFieldTypes.TEXT, AS: 'content' },
          '$.tags.*': { type: SchemaFieldTypes.TAG, AS: 'tags' },
          '$.embedding': {
            type: SchemaFieldTypes.VECTOR,
            AS: 'embedding',
            ALGORITHM: VectorAlgorithms.HNSW,
            TYPE: 'FLOAT32',
            DIM: VECTOR_DIMENSION,
            DISTANCE_METRIC: 'COSINE',
          },
        },
        { ON: 'JSON', PREFIX: 'context:' },
      );
    } catch (e: any) {
      if (!e.message.includes('Index already exists')) throw e;
      // If the index exists without the `confidence` field, drop and recreate
      // by running once: `await this.client.ft.dropIndex('idx:context')`.
    }
  }

  async storeNode(node: ContextNode, embedding: number[]): Promise<void> {
    await this.client.json.set(`context:${node.id}`, '$', {
      ...node,
      embedding,
    });
  }

  async deleteNode(id: string): Promise<void> {
    await this.client.del(`context:${id}`);
  }

  async deleteByRepo(repoId: string): Promise<void> {
    const keys = await this.client.keys(`context:*`);
    for (const key of keys) {
      const rid = await this.client.json.get(key, { path: '$.repoId' });
      if (Array.isArray(rid) && rid[0] === repoId) await this.client.del(key);
    }
  }

  async search(
    queryEmbedding: number[],
    options: {
      ownerId: string;
      repoId?: string;
      type?: string;
      k?: number;
      // Priority 1 — token minimization
      budget?: number;
      minConfidence?: EdgeConfidence;
    },
  ): Promise<Array<{ node: ContextNode; score: number }>> {
    const { ownerId, repoId, type, k = 10, budget, minConfidence } = options;
    const filters: string[] = [`@ownerId:{${escapeTagValue(ownerId)}}`];
    if (repoId) filters.push(`@repoId:{${escapeTagValue(repoId)}}`);
    if (type) filters.push(`@type:{${escapeTagValue(type)}}`);

    // Confidence filter — EXTRACTED is the strictest, INFERRED widens to both,
    // SPECULATIVE (or undefined) imposes no filter.
    if (minConfidence === 'EXTRACTED') {
      filters.push('@confidence:{EXTRACTED}');
    } else if (minConfidence === 'INFERRED') {
      filters.push('@confidence:{EXTRACTED|INFERRED}');
    }

    const filter = filters.length ? filters.join(' ') : '*';
    const blob = Buffer.from(new Float32Array(queryEmbedding).buffer);
    const res = await this.client.ft.search(
      'idx:context',
      `(${filter})=>[KNN ${k} @embedding $BLOB AS __score]`,
      { PARAMS: { BLOB: blob }, DIALECT: 2, RETURN: ['$', '__score'] },
    );

    // Hydrate each result. node-redis can return the inline JSON under
    // doc.value['$'] either as a string or an array (depending on path/shape),
    // and in some cases not at all. Fall back to JSON.GET on the key so we
    // never blow up on `JSON.parse("undefined")`. Embedding vector is stripped
    // from the returned node since callers only need the node payload.
    let results = (
      await Promise.all(
        res.documents.map(async (doc) => {
          const node = await this.hydrateDoc(doc);
          if (!node) return null;
          const scoreRaw = doc.value['__score'];
          const score =
            typeof scoreRaw === 'string' ? 1 - parseFloat(scoreRaw) : 0;
          return { node, score };
        }),
      )
    ).filter((r): r is { node: ContextNode; score: number } => r !== null);

    // Budget trimming — stop once the rough char budget (≈4 chars/token) is hit.
    if (budget) {
      const budgetChars = budget * 4;
      let charCount = 0;
      results = results.filter((r) => {
        charCount += r.node.content.length + r.node.label.length;
        return charCount <= budgetChars;
      });
    }

    return results;
  }

  /**
   * Resolve a search hit into a ContextNode. Tries the inline payload first
   * (different node-redis versions surface `$` as string OR array), then
   * falls back to a JSON.GET on the document id. Returns null when the
   * document cannot be hydrated so the caller can skip it gracefully.
   */
  private async hydrateDoc(doc: {
    id: string;
    value: Record<string, unknown>;
  }): Promise<ContextNode | null> {
    const inline = doc.value['$'];

    if (typeof inline === 'string' && inline.length && inline !== 'undefined') {
      try {
        const parsed = JSON.parse(inline);
        return stripEmbedding(Array.isArray(parsed) ? parsed[0] : parsed);
      } catch {
        /* fall through to JSON.GET */
      }
    } else if (Array.isArray(inline) && inline.length) {
      return stripEmbedding(inline[0] as ContextNode);
    } else if (inline && typeof inline === 'object') {
      return stripEmbedding(inline as ContextNode);
    }

    try {
      const fetched = await this.client.json.get(doc.id);
      if (!fetched) return null;
      return stripEmbedding(fetched as unknown as ContextNode);
    } catch {
      return null;
    }
  }

  // ── Generic cache primitives ─────────────────────────────────────────────
  // Used by feature services (e.g. SearchService) to cache responses.
  // Tag-based invalidation: each tag is a Redis SET of keys belonging to it,
  // so writers can flush a logical slice without scanning every key.

  async cacheGet<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      // Corrupt entry — drop it so the next request repopulates.
      await this.client.del(key);
      return null;
    }
  }

  async cacheSet<T>(
    key: string,
    value: T,
    ttlSeconds: number,
    tags: string[] = [],
  ): Promise<void> {
    await this.client.set(key, JSON.stringify(value), { EX: ttlSeconds });
    if (tags.length === 0) return;
    const multi = this.client.multi();
    for (const tag of tags) {
      multi.sAdd(tag, key);
      // Tag set lives a bit longer than the entry so concurrent writes still
      // see membership during invalidation; eventually it self-expires.
      multi.expire(tag, ttlSeconds * 2);
    }
    await multi.exec();
  }

  async cacheInvalidateTag(tag: string): Promise<number> {
    const keys = await this.client.sMembers(tag);
    let deleted = 0;
    if (keys.length) {
      deleted = await this.client.del(keys);
    }
    await this.client.del(tag);
    return deleted;
  }

  async cacheInvalidateTags(tags: string[]): Promise<number> {
    let total = 0;
    for (const tag of tags) total += await this.cacheInvalidateTag(tag);
    return total;
  }
}

/**
 * Escape special characters in a Redis Search TAG value.
 * Redis treats `,.<>{}[]"':;!@#$%^&*()-+=~|/ \` and others as punctuation/
 * separators inside TAG fields. UUIDs (with `-`), file paths (with `/`, `.`),
 * and emails would otherwise produce empty/invalid filters and surface as a
 * generic "Syntax error" from FT.SEARCH. Backslash-escape every special char.
 */
function escapeTagValue(value: string): string {
  return value.replace(/[,.<>{}[\]"':;!@#$%^&*()\-+=~|/\\ ]/g, '\\$&');
}

/** Drop the embedding vector from a node payload before returning to API consumers. */
function stripEmbedding(
  node: ContextNode & { embedding?: unknown },
): ContextNode {
  if (node && typeof node === 'object' && 'embedding' in node) {
    const { embedding: _embedding, ...rest } = node as ContextNode & {
      embedding?: unknown;
    };
    return rest as ContextNode;
  }
  return node;
}
