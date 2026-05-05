import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';
import {
  AnalyzeRepoDto,
  AnalyzeRepoResult,
  GraphQueryDto,
  IngestGraphDto,
} from '@graphchat/shared-types';

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
      baseURL: this.cfg.get('GRAPH_SERVICE_URL', 'http://graph-service:5000'),
      timeout: 120_000, // 2 min — large repos take time
    });
  }

  /**
   * Surface the sidecar's real error to the caller instead of letting axios
   * failures fall through as a generic 500. FastAPI puts its message in
   * `detail`; if absent we keep whatever string the body had.
   */
  private rethrow(err: unknown, op: string): never {
    if (axios.isAxiosError(err)) {
      const ax = err as AxiosError<{ detail?: unknown; message?: unknown }>;
      const status = ax.response?.status;
      const body = ax.response?.data;
      const detail =
        (body && typeof body === 'object'
          ? (body.detail ?? body.message)
          : body) ?? ax.message;
      const message =
        typeof detail === 'string' ? detail : JSON.stringify(detail);
      this.logger.warn(`${op} failed (status=${status ?? 'n/a'}): ${message}`);
      if (status && status >= 400 && status < 600) {
        throw new HttpException({ message, upstream: 'graph-service' }, status);
      }
      throw new InternalServerErrorException(
        `graph-service unreachable: ${message}`,
      );
    }
    this.logger.error(`${op} failed: ${String(err)}`);
    throw new InternalServerErrorException(`graph-service ${op} failed`);
  }

  /**
   * Ingest a client-extracted graph payload (CLI ran Tree-sitter locally).
   *
   * The body can be large (10s of MB on big repos), so we set a generous
   * timeout and let the underlying HTTP body limit be handled by Nest's
   * `bodyParser` config in main.ts.
   */
  async ingestGraph(dto: IngestGraphDto): Promise<AnalyzeRepoResult> {
    try {
      const { data } = await this.client.post(
        '/ingest',
        {
          repo_id: dto.repoId,
          nodes: dto.nodes,
          edges: dto.edges,
          languages: dto.languages ?? [],
        },
        { maxBodyLength: Infinity, maxContentLength: Infinity },
      );
      return {
        repoId: data.repo_id,
        nodesAdded: data.nodes_added,
        edgesAdded: data.edges_added,
        communities: data.communities,
        godNodes: data.god_nodes,
        durationMs: data.duration_ms,
      };
    } catch (err) {
      this.rethrow(err, 'ingest');
    }
  }

  /** Trigger the full AST + cluster pipeline for a repo. */
  async analyzeRepo(dto: AnalyzeRepoDto): Promise<AnalyzeRepoResult> {
    try {
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
    } catch (err) {
      this.rethrow(err, 'analyze');
    }
  }

  /** Re-cluster the existing graph (e.g. after UI added new nodes). */
  async recluster(repoId: string): Promise<void> {
    try {
      await this.client.post('/cluster', { repo_id: repoId });
    } catch (err) {
      this.rethrow(err, 'cluster');
    }
  }

  /** Graph-expanded query — call after vector search produces seed IDs. */
  async query(dto: GraphQueryDto & { seedNodeIds: string[] }) {
    try {
      const { data } = await this.client.post('/query', {
        repo_id: dto.repoId,
        query: dto.query,
        mode: dto.mode ?? 'knn',
        budget: dto.budget ?? 2000,
        hops: dto.hops ?? 2,
        seed_node_ids: dto.seedNodeIds,
      });
      return data;
    } catch (err) {
      this.rethrow(err, 'query');
    }
  }

  /** Fetch the pre-built GRAPH_REPORT.md for a repo. */
  async getReport(repoId: string): Promise<string> {
    try {
      const { data } = await this.client.get(
        `/report/${encodeURIComponent(repoId)}`,
      );
      return data.report;
    } catch (err) {
      this.rethrow(err, 'report');
    }
  }

  /** Shortest path between two node labels. */
  async getPath(repoId: string, source: string, target: string) {
    try {
      const { data } = await this.client.get('/path', {
        params: { repo_id: repoId, source, target },
      });
      return data;
    } catch (err) {
      this.rethrow(err, 'path');
    }
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
