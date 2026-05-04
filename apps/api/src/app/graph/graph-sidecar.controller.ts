import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CommunityCacheService } from './community-cache.service';
import { GraphBridgeService } from './graph-bridge.service';

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
  ) {}

  /** Trigger AST + Leiden analysis for a repo. */
  @Post('analyze')
  analyze(@Body() body: { repoId: string; repoPath: string }) {
    return this.bridge.analyzeRepo({
      repoId: body.repoId,
      repoPath: body.repoPath,
    });
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
