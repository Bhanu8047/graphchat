import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AuthenticatedUser, GraphSyncDto } from '@trchat/shared-types';
import { GraphService } from './graph.service';
import { ReposService } from '../repos/repos.service';
import { CurrentUser } from '../common/auth/current-user.decorator';

@Controller('graphs')
export class GraphController {
  constructor(
    private readonly graphService: GraphService,
    private readonly reposService: ReposService,
  ) {}

  @Get(':repoId')
  getGraph(
    @Param('repoId') repoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.graphService.getGraph(repoId, user.id);
  }

  @Post(':repoId/sync/github')
  syncGithub(
    @Param('repoId') repoId: string,
    @Body() dto: GraphSyncDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reposService.syncGithub(repoId, dto, user.id);
  }
}
