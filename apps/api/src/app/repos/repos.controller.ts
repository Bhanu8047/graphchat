import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { AuthenticatedUser } from '@vectorgraph/shared-types';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { ReposService } from './repos.service';
import {
  CreateRepoDto,
  GraphSyncDto,
  ImportGithubRepoDto,
} from '@vectorgraph/shared-types';

@Controller('repos')
export class ReposController {
  constructor(private svc: ReposService) {}
  @Get() findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.svc.findAll(user.id);
  }
  @Post('import/github/branches') listGithubBranches(
    @Body() dto: { url: string; accessToken?: string },
  ) {
    return this.svc.listGithubBranches(dto.url, dto.accessToken);
  }
  @Get(':id') findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.findOne(id, user.id);
  }
  @Post() create(
    @Body() dto: CreateRepoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.create(dto, user.id);
  }
  @Post('import/github') importGithub(
    @Body() dto: ImportGithubRepoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.importGithub(dto, user.id);
  }
  @Post(':id/sync/github') syncGithub(
    @Param('id') id: string,
    @Body() dto: GraphSyncDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.syncGithub(id, dto, user.id);
  }
  @Delete(':id') remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.remove(id, user.id);
  }
}
