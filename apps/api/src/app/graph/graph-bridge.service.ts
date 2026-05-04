import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  AnalyzeRepoDto,
  AnalyzeRepoResult,
  GraphQueryDto,
} from '@vectorgraph/shared-types';

/**
 * Thin HTTP bridge from NestJS to the Python `graph-service` (FastAPI on :5000).
 * Encapsulates the wire format conversion (snake_case ↔ camelCase) and
 * surfaces typed results to the rest of the API.
 */
@Injectable()
export class GraphBridgeService {
  private readonly logger = new Logger(GraphBridgeService.name);
  private client: AxiosInstance;

  constructor(private cfg: ConfigService) {
    this.client = axios.create({
      baseURL: this.cfg.get(
        'GRAPH_SERVICE_URL',
        'http://graph-service:5000',
      ),
      timeout: 120_000, // 2 min — large repos take time
    });
  }

  /** Trigger the full AST + cluster pipeline for a repo. */
  async analyzeRepo(dto: AnalyzeRepoDto): Promise<AnalyzeRepoResult> {
    const { data } = await this.client.post('/analyze', {
      repo_id: dto.repoId,
      repo_path: dto.repoPath,
      languages: dto.languages ?? [],
    });
    return {
      repoId: data.repo_id,
      nodesAdded: data.nodes_added,
      edgesAdded: data.edges_added,
      communities: data.communities,
      godNodes: data.god_nodes,
      durationMs: data.duration_ms,
    };
  }

  /** Re-cluster the existing graph (e.g. after UI added new nodes). */
  async recluster(repoId: string): Promise<void> {
    await this.client.post('/cluster', { repo_id: repoId });
  }

  /** Graph-expanded query — call after vector search produces seed IDs. */
  async query(dto: GraphQueryDto & { seedNodeIds: string[] }) {
    const { data } = await this.client.post('/query', {
      repo_id: dto.repoId,
      query: dto.query,
      mode: dto.mode ?? 'knn',
      budget: dto.budget ?? 2000,
      hops: dto.hops ?? 2,
      seed_node_ids: dto.seedNodeIds,
    });
    return data;
  }

  /** Fetch the pre-built GRAPH_REPORT.md for a repo. */
  async getReport(repoId: string): Promise<string> {
    const { data } = await this.client.get(`/report/${repoId}`);
    return data.report;
  }

  /** Shortest path between two node labels. */
  async getPath(repoId: string, source: string, target: string) {
    const { data } = await this.client.get('/path', {
      params: { repo_id: repoId, source, target },
    });
    return data;
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch (err) {
      this.logger.warn(`graph-service health check failed: ${String(err)}`);
      return false;
    }
  }
}
