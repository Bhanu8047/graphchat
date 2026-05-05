import { Controller, Get } from '@nestjs/common';
import { AuthenticatedUser } from '@graphchat/shared-types';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('stats')
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.getStats(user.id);
  }
}
