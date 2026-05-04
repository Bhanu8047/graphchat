import { createClient, SchemaFieldTypes, VectorAlgorithms } from 'redis';
import {
  ContextNode,
  EdgeConfidence,
  VECTOR_DIMENSION,
} from '@vectorgraph/shared-types';

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
    const filters: string[] = [`@ownerId:{${ownerId}}`];
    if (repoId) filters.push(`@repoId:{${repoId}}`);
    if (type) filters.push(`@type:{${type}}`);

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
    let results = res.documents.map((doc) => ({
      node: JSON.parse(doc.value['$'] as string) as ContextNode,
      score: 1 - parseFloat(doc.value['__score'] as string),
    }));

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
}
