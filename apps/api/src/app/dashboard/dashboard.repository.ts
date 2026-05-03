import { Injectable } from '@nestjs/common';
import {
  DashboardRecentRepo,
  DashboardStats,
  Repository,
} from '@vectorgraph/shared-types';
import { MongoDatabaseService } from '../common/database/mongo-database.service';

@Injectable()
export class DashboardRepository {
  constructor(private readonly database: MongoDatabaseService) {}

  async getStats(ownerId: string): Promise<DashboardStats> {
    const repositories = this.database.collection<Repository>('repositories');
    const graphNodes = this.database.collection<any>('graph_nodes');
    const graphEdges = this.database.collection<any>('graph_edges');
    const semanticNodes = this.database.collection<any>('context_nodes');

    const [
      repoCount,
      graphNodeCount,
      graphEdgeCount,
      semanticNodeCount,
      recentRepos,
    ] = await Promise.all([
      repositories.countDocuments({ ownerId }),
      graphNodes.countDocuments({ ownerId }),
      graphEdges.countDocuments({ ownerId }),
      semanticNodes.countDocuments({ ownerId }),
      repositories
        .find({ ownerId }, { projection: { _id: 0 } })
        .sort({ updatedAt: -1 })
        .limit(6)
        .toArray(),
    ]);

    return {
      totals: {
        repositories: repoCount,
        graphs: repoCount,
        graphNodes: graphNodeCount,
        graphEdges: graphEdgeCount,
        semanticNodes: semanticNodeCount,
      },
      recentRepositories: recentRepos.map(
        (repo): DashboardRecentRepo => ({
          id: repo.id,
          name: repo.name,
          description: repo.description,
          updatedAt: repo.updatedAt,
          techStack: repo.techStack,
          branch: repo.source?.branch,
          nodes: repo.sync?.nodeCount ?? repo.nodes?.length ?? 0,
        }),
      ),
    };
  }
}
