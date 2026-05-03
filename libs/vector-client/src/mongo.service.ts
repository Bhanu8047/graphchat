import { MongoClient, Collection, Document } from 'mongodb';
import { ContextNode, Repository } from '@vectorgraph/shared-types';

type NodeDoc = ContextNode & { embedding: number[] };

export class MongoVectorService {
  private client: MongoClient;
  private repoCol!: Collection<Repository>;
  private nodeCol!: Collection<NodeDoc>;

  constructor(uri?: string) {
    this.client = new MongoClient(uri ?? process.env.MONGODB_URI!);
  }

  async connect(): Promise<void> {
    await this.client.connect();
    const db = this.client.db('vectorgraph');
    this.repoCol = db.collection<Repository>('repositories');
    this.nodeCol = db.collection<NodeDoc>('context_nodes');
    await this.nodeCol.createIndex({ repoId: 1 });
    await this.nodeCol.createIndex({ type: 1 });
  }

  async saveRepo(repo: Repository): Promise<void> {
    await this.repoCol.updateOne({ id: repo.id }, { $set: repo }, { upsert: true });
  }

  async getRepo(id: string): Promise<Repository | null> {
    return this.repoCol.findOne({ id }, { projection: { _id: 0 } });
  }

  async findRepoByGithubFullName(fullName: string): Promise<Repository | null> {
    return this.repoCol.findOne(
      { 'source.provider': 'github', 'source.fullName': fullName },
      { projection: { _id: 0 } }
    );
  }

  async getAllRepos(): Promise<Repository[]> {
    const repos = await this.repoCol.find({}, { projection: { _id: 0 } }).toArray();
    return Promise.all(repos.map(async repo => ({
      ...repo,
      nodes: await this.getNodes(repo.id),
    })));
  }

  async deleteRepo(id: string): Promise<void> {
    await this.repoCol.deleteOne({ id });
    await this.nodeCol.deleteMany({ repoId: id });
  }

  async deleteNodesByRepo(repoId: string): Promise<void> {
    await this.nodeCol.deleteMany({ repoId });
  }

  async saveNode(node: ContextNode, embedding: number[]): Promise<void> {
    await this.nodeCol.updateOne(
      { id: node.id },
      { $set: { ...node, embedding, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
  }

  async getNodes(repoId: string): Promise<ContextNode[]> {
    return this.nodeCol
      .find({ repoId }, { projection: { _id: 0, embedding: 0 } })
      .toArray() as unknown as Promise<ContextNode[]>;
  }

  async deleteNode(id: string): Promise<void> {
    await this.nodeCol.deleteOne({ id });
  }

  async getContextMap(repoId: string): Promise<Map<string, ContextNode[]>> {
    const nodes = await this.getNodes(repoId);
    const map = new Map<string, ContextNode[]>();
    nodes.forEach(n => { const arr = map.get(n.type) ?? []; arr.push(n); map.set(n.type, arr); });
    return map;
  }

  async vectorSearch(
    queryEmbedding: number[],
    options: { repoId?: string; type?: string; limit?: number } = {}
  ): Promise<Array<{ node: ContextNode; score: number }>> {
    const { repoId, type, limit = 10 } = options;
    const filter: Document = {};
    if (repoId) filter.repoId = repoId;
    if (type)   filter.type   = type;

    const pipeline: Document[] = [
      {
        $vectorSearch: {
          index: 'ctx_vector_idx',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: limit * 10,
          limit,
          ...(Object.keys(filter).length ? { filter } : {}),
        },
      },
      { $project: { embedding: 0, _id: 0, score: { $meta: 'vectorSearchScore' } } },
    ];

    const docs = await this.nodeCol.aggregate<NodeDoc & { score: number }>(pipeline).toArray();
    return docs.map(({ score, ...node }) => ({ node: node as ContextNode, score }));
  }
}
