import { Controller, Get } from '@nestjs/common';
import { AuthenticatedUser } from '@graphchat/shared-types';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { UsageService } from '../usage/usage.service';
import { ModelCatalogService } from './model-catalog.service';

@Controller('models')
export class ModelCatalogController {
  constructor(
    private readonly catalog: ModelCatalogService,
    private readonly usage: UsageService,
  ) {}

  @Get('available')
  async available(@CurrentUser() user: AuthenticatedUser) {
    const summaries = await this.usage.getModelUsageSummary(user.id);
    return this.catalog.getAvailableModels(summaries);
  }
}
