import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoVectorService } from '@vectorgraph/vector-client';
import { GraphNode, GraphSnapshot } from '@vectorgraph/shared-types';

@Injectable()
export class GraphService {
  private mongo: MongoVectorService;

  constructor(cfg: ConfigService) {
    this.mongo = new MongoVectorService(cfg.get('MONGODB_URI'));
  }

  async onModuleInit() {
    await this.mongo.connect();
  }

  async getGraph(repoId: string): Promise<GraphSnapshot> {
    const repository = await this.mongo.getRepo(repoId);
    if (!repository) {
      throw new NotFoundException(`Repo ${repoId} not found`);
    }

    const [structuralNodes, semanticNodes, edges] = await Promise.all([
      this.mongo.getGraphNodes(repoId),
      this.mongo.getNodes(repoId),
      this.mongo.getGraphEdges(repoId),
    ]);

    const semanticGraphNodes: GraphNode[] = semanticNodes.map(node => ({
      id: node.id,
      repoId: node.repoId,
      type: node.type,
      label: node.label,
      path: node.sourcePath,
      depth: node.sourcePath ? node.sourcePath.split('/').length + 1 : 1,
      digest: node.fileDigest,
      tags: node.tags,
      updatedAt: node.updatedAt,
    }));

    return {
      repository: {
        ...repository,
        nodes: semanticNodes,
      },
      nodes: [...structuralNodes, ...semanticGraphNodes],
      edges,
      stats: {
        structuralNodeCount: structuralNodes.length,
        semanticNodeCount: semanticNodes.length,
        edgeCount: edges.length,
      },
    };
  }
}