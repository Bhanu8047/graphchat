import { Injectable, OnModuleInit } from '@nestjs/common';
import { MongoVectorService } from '@vectorgraph/vector-client';
import { AgentExportPayload, NodeType } from '@vectorgraph/shared-types';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ExportService implements OnModuleInit {
  private mongo: MongoVectorService;
  constructor(cfg: ConfigService) {
    this.mongo = new MongoVectorService(cfg.get('MONGODB_URI'));
  }
  async onModuleInit() { await this.mongo.connect(); }

  async exportRepo(repoId: string): Promise<AgentExportPayload> {
    const repo = await this.mongo.getRepo(repoId);
    if (!repo) throw new Error(`Repo ${repoId} not found`);
    const [contextMap, graphNodes, graphEdges] = await Promise.all([
      this.mongo.getContextMap(repoId),
      this.mongo.getGraphNodes(repoId),
      this.mongo.getGraphEdges(repoId),
    ]);
    const nodeTypes: NodeType[] = ['module','api','schema','entry','config','note'];
    const nodes = await this.mongo.getNodes(repoId);

    return {
      repository:  { name: repo.name, description: repo.description, techStack: repo.techStack, agent: repo.agent },
      contextMap:  Object.fromEntries(nodeTypes.map(t => [t, (contextMap.get(t) ?? []).map(({ id, repoId: _r, embedding: _e, ...rest }) => rest)])) as AgentExportPayload['contextMap'],
      vectorIndex: nodes.map(n => ({ id: n.id, type: n.type, label: n.label, tags: n.tags })),
      graph:       { nodes: graphNodes, edges: graphEdges, sync: repo.sync },
      agentHint:   'Fetch this payload once per session. Use graph.nodes and graph.edges for structural traversal, contextMap[type] for semantic snippets, and vectorIndex ids to run semantic search.',
      meta:        { totalNodes: nodes.length, lastUpdated: repo.updatedAt, format: 'VectorGraph-v2' },
    };
  }
}
