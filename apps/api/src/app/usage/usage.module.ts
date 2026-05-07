import { Module } from '@nestjs/common';
import { ModelQuotasModule } from '../model-quotas/model-quotas.module';
import { UsageController } from './usage.controller';
import { UsageRepository } from './usage.repository';
import { UsageService } from './usage.service';

@Module({
  imports: [ModelQuotasModule],
  controllers: [UsageController],
  providers: [UsageService, UsageRepository],
  exports: [UsageService],
})
export class UsageModule {}
