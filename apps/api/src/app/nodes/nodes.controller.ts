import { Controller, Post, Delete, Param, Body } from '@nestjs/common';
import { NodesService } from './nodes.service';
import { AuthenticatedUser, CreateNodeDto } from '@graphchat/shared-types';
import { CurrentUser } from '../common/auth/current-user.decorator';

@Controller('nodes')
export class NodesController {
  constructor(private svc: NodesService) {}
  @Post() create(
    @Body() dto: CreateNodeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.create(dto, user.id);
  }
  @Delete(':id') remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.remove(id, user.id);
  }
}
