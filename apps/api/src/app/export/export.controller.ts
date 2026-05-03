import { Controller, Get, Param } from '@nestjs/common';
import { AuthenticatedUser } from '@vectorgraph/shared-types';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { ExportService } from './export.service';

@Controller('export')
export class ExportController {
  constructor(private svc: ExportService) {}
  @Get(':id') export(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.exportRepo(id, user.id);
  }
}
