import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  AuthenticatedUser,
  GraphQueryDto,
  IngestGraphDto,
} from '@graphchat/shared-types';
import { CommunityCacheService } from './community-cache.service';
import { GraphBridgeService } from './graph-bridge.service';
import { SearchService } from '../search/search.service';
import { CurrentUser } from '../common/auth/current-user.decorator';

/**
 * REST surface for the Python graph sidecar.
 * Mounted at `/api/graph/...` (singular) — distinct from the existing
 * structural `/api/graphs/...` controller.
 */
@Controller('graph')
export class GraphSidecarController {
  constructor(
    private readonly bridge: GraphBridgeService,
    private readonly cache: CommunityCacheService,
    private readonly search: SearchService,
  ) {}

  /**
   * Graph-expanded query. Embeds the question, runs vector KNN to pick
   * seed nodes, then asks the sidecar to expand from those seeds. Returns
   * the sidecar's payload directly.
   */
  @Post('query')
  async query(
    @Body() dto: GraphQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!dto?.repoId || !dto?.query?.trim()) {
      throw new HttpException('repoId and query are required.', 400);
    }
    const seeds = await this.search.search(
      { q: dto.query, repoId: dto.repoId, k: 5 },
      user.id,
    );
    const seedNodeIds = seeds.map((s) => s.node.id);
    if (!seedNodeIds.length) {
      return { nodes: [], total_chars: 0, truncated: false };
    }
    return this.bridge.query({ ...dto, seedNodeIds });
  }

  /** Trigger AST + Leiden analysis for a repo (server-side path-based). */
  @Post('analyze')
  analyze(@Body() body: { repoId: string; repoPath: string }) {
    return this.bridge.analyzeRepo({
      repoId: body.repoId,
      repoPath: body.repoPath,
    });
  }

  /**
   * Ingest a client-extracted graph payload. The CLI runs Tree-sitter
   * locally and posts the resulting nodes/edges; source code never reaches
   * the API. This is the preferred path for SaaS deployments.
   *
   * ownerId is stamped here (the Python sidecar has no auth context) so that
   * getNodesForOwner / getContextNeighbors queries find the stored docs.
   */
  @Post('ingest')
  ingest(@Body() body: IngestGraphDto, @CurrentUser() user: AuthenticatedUser) {
    const stamped: IngestGraphDto = {
      ...body,
      nodes: body.nodes.map((n) => ({ ...n, ownerId: user.id })),
      edges: body.edges.map((e) => ({ ...e, ownerId: user.id })),
    };
    return this.bridge.ingestGraph(stamped);
  }

  /** Re-cluster after the UI added new nodes. */
  @Post('cluster/:repoId')
  recluster(@Param('repoId') repoId: string) {
    return this.bridge.recluster(repoId);
  }

  /** Pre-built `GRAPH_REPORT.md` for the repo. */
  @Get('report/:repoId')
  async report(@Param('repoId') repoId: string) {
    const report = await this.bridge.getReport(repoId);
    return { report };
  }

  /** All cached community metadata for a repo. */
  @Get('communities/:repoId')
  communities(@Param('repoId') repoId: string) {
    return this.cache.getRepoCommunities(repoId);
  }

  /** Pre-built community context prompt. */
  @Get('community/:communityId/prompt')
  async communityPrompt(@Param('communityId') communityId: string) {
    const prompt = await this.cache.getCommunityPrompt(communityId);
    return { prompt };
  }

  /** Shortest path between two node labels. */
  @Get('path')
  path(
    @Query('repoId') repoId: string,
    @Query('source') source: string,
    @Query('target') target: string,
  ) {
    return this.bridge.getPath(repoId, source, target);
  }

  /** Sidecar health check. */
  @Get('health')
  async health() {
    return { ok: await this.bridge.isHealthy() };
  }
}
