import { Controller, Get } from '@nestjs/common';
import { AuthenticatedUser } from '@graphchat/shared-types';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { UsageService } from './usage.service';

@Controller('usage')
export class UsageController {
  constructor(private readonly usage: UsageService) {}

  @Get('me')
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.usage.getModelUsageSummary(user.id);
  }

  @Get('me/daily')
  daily(@CurrentUser() user: AuthenticatedUser) {
    return this.usage.listForUser(user.id);
  }
}
