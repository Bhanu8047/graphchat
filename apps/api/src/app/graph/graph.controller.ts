import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { GraphSyncDto } from '@vectorgraph/shared-types';
import { GraphService } from './graph.service';
import { ReposService } from '../repos/repos.service';

@Controller('graphs')
export class GraphController {
  constructor(
    private readonly graphService: GraphService,
    private readonly reposService: ReposService,
  ) {}

  @Get(':repoId')
  getGraph(@Param('repoId') repoId: string) {
    return this.graphService.getGraph(repoId);
  }

  @Post(':repoId/sync/github')
  syncGithub(@Param('repoId') repoId: string, @Body() dto: GraphSyncDto) {
    return this.reposService.syncGithub(repoId, dto);
  }
}