import { MongoClient, Collection, Document } from 'mongodb';
import {
  Community,
  ContextEdge,
  ContextNode,
  GraphEdge,
  GraphNode,
  Repository,
} from '@trchat/shared-types';

type NodeDoc = ContextNode & { embedding: number[] };

export class MongoVectorService {
  private client: MongoClient;
  private repoCol!: Collection<Repository>;
  private nodeCol!: Collection<NodeDoc>;
  private graphNodeCol!: Collection<GraphNode>;
  private edgeCol!: Collection<GraphEdge>;
  private contextEdgeCol!: Collection<ContextEdge>;
  private communityCol!: Collection<Community>;

  constructor(uri?: string) {
    this.client = new MongoClient(uri ?? process.env.MONGODB_URI!);
  }

  async connect(): Promise<void> {
    await this.client.connect();
    const db = this.client.db('vectorgraph');
    this.repoCol = db.collection<Repository>('repositories');
    this.nodeCol = db.collection<NodeDoc>('context_nodes');
    this.graphNodeCol = db.collection<GraphNode>('graph_nodes');
    this.edgeCol = db.collection<GraphEdge>('graph_edges');
    this.contextEdgeCol = db.collection<ContextEdge>('context_edges');
    this.communityCol = db.collection<Community>('communities');
    await this.repoCol.createIndex({ ownerId: 1 });
    await this.repoCol.createIndex({
      ownerId: 1,
      'source.fullName': 1,
      'source.branch': 1,
    });
    await this.nodeCol.createIndex({ ownerId: 1 });
    await this.nodeCol.createIndex({ repoId: 1 });
    await this.nodeCol.createIndex({ type: 1 });
    await this.nodeCol.createIndex({ ownerId: 1, repoId: 1, sourcePath: 1 });
    await this.graphNodeCol.createIndex({ ownerId: 1 });
    await this.graphNodeCol.createIndex({ repoId: 1 });
    await this.graphNodeCol.createIndex({
      ownerId: 1,
      repoId: 1,
      type: 1,
      path: 1,
    });
    await this.edgeCol.createIndex({ ownerId: 1 });
    await this.edgeCol.createIndex({ repoId: 1 });
    await this.edgeCol.createIndex({ repoId: 1, sourceId: 1 });
    // Priority 2 — context_edges + communities indexes for the graph sidecar
    await this.contextEdgeCol.createIndex({ repoId: 1 });
    await this.contextEdgeCol.createIndex({ sourceId: 1 });
    await this.contextEdgeCol.createIndex({ targetId: 1 });
    await this.communityCol.createIndex({ repoId: 1 });
    await this.communityCol.createIndex({ godNodeId: 1 });
  }

  async saveRepo(repo: Repository): Promise<void> {
    await this.repoCol.updateOne(
      { id: repo.id },
      { $set: repo },
      { upsert: true },
    );
  }

  async getRepo(id: string): Promise<Repository | null> {
    return this.repoCol.findOne({ id }, { projection: { _id: 0 } });
  }

  async getRepoForOwner(
    id: string,
    ownerId: string,
  ): Promise<Repository | null> {
    return this.repoCol.findOne({ id, ownerId }, { projection: { _id: 0 } });
  }

  async findRepoByGithubFullName(fullName: string): Promise<Repository | null> {
    return this.repoCol.findOne(
      { 'source.provider': 'github', 'source.fullName': fullName },
      { projection: { _id: 0 } },
    );
  }

  async findRepoByGithubFullNameAndBranch(
    fullName: string,
    branch: string,
  ): Promise<Repository | null> {
    return this.repoCol.findOne(
      {
        'source.provider': 'github',
        'source.fullName': fullName,
        'source.branch': branch,
      },
      { projection: { _id: 0 } },
    );
  }

  async findRepoByGithubFullNameAndBranchForOwner(
    fullName: string,
    branch: string,
    ownerId: string,
  ): Promise<Repository | null> {
    return this.repoCol.findOne(
      {
        ownerId,
        'source.provider': 'github',
        'source.fullName': fullName,
        'source.branch': branch,
      },
      { projection: { _id: 0 } },
    );
  }

  async findReposByGithubFullName(fullName: string): Promise<Repository[]> {
    return this.repoCol
      .find(
        { 'source.provider': 'github', 'source.fullName': fullName },
        { projection: { _id: 0 } },
      )
      .sort({ updatedAt: -1 })
      .toArray();
  }

  async findReposByGithubFullNameForOwner(
    fullName: string,
    ownerId: string,
  ): Promise<Repository[]> {
    return this.repoCol
      .find(
        { ownerId, 'source.provider': 'github', 'source.fullName': fullName },
        { projection: { _id: 0 } },
      )
      .sort({ updatedAt: -1 })
      .toArray();
  }

  async getAllRepos(): Promise<Repository[]> {
    const repos = await this.repoCol
      .find({}, { projection: { _id: 0 } })
      .toArray();
    return Promise.all(
      repos.map(async (repo) => ({
        ...repo,
        nodes: await this.getNodes(repo.id),
      })),
    );
  }

  async getAllReposForOwner(ownerId: string): Promise<Repository[]> {
    const repos = await this.repoCol
      .find({ ownerId }, { projection: { _id: 0 } })
      .toArray();
    return Promise.all(
      repos.map(async (repo) => ({
        ...repo,
        nodes: await this.getNodes(repo.id),
      })),
    );
  }

  async deleteRepo(id: string): Promise<void> {
    await this.repoCol.deleteOne({ id });
    await this.nodeCol.deleteMany({ repoId: id });
    await this.graphNodeCol.deleteMany({ repoId: id });
    await this.edgeCol.deleteMany({ repoId: id });
  }

  async deleteNodesByRepo(repoId: string): Promise<void> {
    await this.nodeCol.deleteMany({ repoId });
  }

  async getNodesBySourcePaths(
    repoId: string,
    sourcePaths: string[],
  ): Promise<ContextNode[]> {
    if (sourcePaths.length === 0) return [];
    return this.nodeCol
      .find(
        { repoId, sourcePath: { $in: sourcePaths } },
        { projection: { _id: 0, embedding: 0 } },
      )
      .toArray() as unknown as Promise<ContextNode[]>;
  }

  async getStoredNodesBySourcePaths(
    repoId: string,
    sourcePaths: string[],
  ): Promise<NodeDoc[]> {
    if (sourcePaths.length === 0) return [];
    return this.nodeCol
      .find(
        { repoId, sourcePath: { $in: sourcePaths } },
        { projection: { _id: 0 } },
      )
      .toArray();
  }

  async deleteNodesBySourcePaths(
    repoId: string,
    sourcePaths: string[],
  ): Promise<void> {
    if (sourcePaths.length === 0) return;
    await this.nodeCol.deleteMany({ repoId, sourcePath: { $in: sourcePaths } });
  }

  async saveNode(node: ContextNode, embedding: number[]): Promise<void> {
    await this.nodeCol.updateOne(
      { id: node.id },
      { $set: { ...node, embedding, updatedAt: new Date().toISOString() } },
      { upsert: true },
    );
  }

  async getNodes(repoId: string): Promise<ContextNode[]> {
    return this.nodeCol
      .find({ repoId }, { projection: { _id: 0, embedding: 0 } })
      .toArray() as unknown as Promise<ContextNode[]>;
  }

  async getNodesForOwner(
    repoId: string,
    ownerId: string,
  ): Promise<ContextNode[]> {
    return this.nodeCol
      .find({ repoId, ownerId }, { projection: { _id: 0, embedding: 0 } })
      .toArray() as unknown as Promise<ContextNode[]>;
  }

  async replaceGraph(
    repoId: string,
    nodes: GraphNode[],
    edges: GraphEdge[],
  ): Promise<void> {
    await Promise.all([
      this.graphNodeCol.deleteMany({ repoId }),
      this.edgeCol.deleteMany({ repoId }),
    ]);

    if (nodes.length) {
      await this.graphNodeCol.insertMany(nodes);
    }

    if (edges.length) {
      await this.edgeCol.insertMany(edges);
    }
  }

  async getGraphNodes(repoId: string): Promise<GraphNode[]> {
    return this.graphNodeCol
      .find({ repoId }, { projection: { _id: 0 } })
      .toArray();
  }

  async getGraphNodesForOwner(
    repoId: string,
    ownerId: string,
  ): Promise<GraphNode[]> {
    return this.graphNodeCol
      .find({ repoId, ownerId }, { projection: { _id: 0 } })
      .toArray();
  }

  async getGraphEdges(repoId: string): Promise<GraphEdge[]> {
    return this.edgeCol.find({ repoId }, { projection: { _id: 0 } }).toArray();
  }

  async getGraphEdgesForOwner(
    repoId: string,
    ownerId: string,
  ): Promise<GraphEdge[]> {
    return this.edgeCol
      .find({ repoId, ownerId }, { projection: { _id: 0 } })
      .toArray();
  }

  async getGraphFileDigests(repoId: string): Promise<Record<string, string>> {
    const fileNodes = await this.graphNodeCol
      .find(
        {
          repoId,
          type: 'file',
          path: { $exists: true },
          digest: { $exists: true },
        },
        { projection: { _id: 0, path: 1, digest: 1 } },
      )
      .toArray();

    return Object.fromEntries(
      fileNodes.flatMap((node) =>
        node.path && node.digest ? [[node.path, node.digest]] : [],
      ),
    );
  }

  async deleteNode(id: string): Promise<void> {
    await this.nodeCol.deleteOne({ id });
  }

  async getNodeByIdForOwner(
    id: string,
    ownerId: string,
  ): Promise<ContextNode | null> {
    return this.nodeCol.findOne(
      { id, ownerId },
      { projection: { _id: 0, embedding: 0 } },
    ) as unknown as Promise<ContextNode | null>;
  }

  async findNodeByLabelForOwner(
    repoId: string,
    label: string,
    ownerId: string,
  ): Promise<ContextNode | null> {
    return this.nodeCol.findOne(
      {
        repoId,
        ownerId,
        // Case-insensitive exact match. Avoids accidental partial matches.
        label: { $regex: `^${escapeRegex(label)}$`, $options: 'i' },
      },
      { projection: { _id: 0, embedding: 0 } },
    ) as unknown as Promise<ContextNode | null>;
  }

  async getContextNeighbors(
    repoId: string,
    nodeId: string,
    limit = 8,
  ): Promise<ContextNode[]> {
    const edges = await this.contextEdgeCol
      .find(
        { repoId, $or: [{ sourceId: nodeId }, { targetId: nodeId }] },
        { projection: { _id: 0, sourceId: 1, targetId: 1, weight: 1 } },
      )
      .sort({ weight: -1 })
      .limit(limit * 2)
      .toArray();

    const neighborIds = Array.from(
      new Set(
        edges.map((e) => (e.sourceId === nodeId ? e.targetId : e.sourceId)),
      ),
    ).slice(0, limit);

    if (!neighborIds.length) return [];

    return this.nodeCol
      .find(
        { repoId, id: { $in: neighborIds } },
        { projection: { _id: 0, embedding: 0 } },
      )
      .toArray() as unknown as Promise<ContextNode[]>;
  }

  async getContextMap(repoId: string): Promise<Map<string, ContextNode[]>> {
    const nodes = await this.getNodes(repoId);
    const map = new Map<string, ContextNode[]>();
    nodes.forEach((n) => {
      const arr = map.get(n.type) ?? [];
      arr.push(n);
      map.set(n.type, arr);
    });
    return map;
  }

  async getContextMapForOwner(
    repoId: string,
    ownerId: string,
  ): Promise<Map<string, ContextNode[]>> {
    const nodes = await this.getNodesForOwner(repoId, ownerId);
    const map = new Map<string, ContextNode[]>();
    nodes.forEach((n) => {
      const arr = map.get(n.type) ?? [];
      arr.push(n);
      map.set(n.type, arr);
    });
    return map;
  }

  async vectorSearch(
    queryEmbedding: number[],
    options: { repoId?: string; type?: string; limit?: number } = {},
  ): Promise<Array<{ node: ContextNode; score: number }>> {
    const { repoId, type, limit = 10 } = options;
    const filter: Document = {};
    if (repoId) filter.repoId = repoId;
    if (type) filter.type = type;

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
      {
        $project: {
          embedding: 0,
          _id: 0,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ];

    const docs = await this.nodeCol
      .aggregate<NodeDoc & { score: number }>(pipeline)
      .toArray();
    return docs.map(({ score, ...node }) => ({
      node: node as ContextNode,
      score,
    }));
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
