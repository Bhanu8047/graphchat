import { Module } from '@nestjs/common';
import { AdminGuard } from '../common/auth/admin.guard';
import { ModelQuotasModule } from '../model-quotas/model-quotas.module';
import { ModelCatalogModule } from '../model-catalog/model-catalog.module';
import { RateLimitsModule } from '../rate-limits/rate-limits.module';
import { UsageModule } from '../usage/usage.module';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    UsersModule,
    RateLimitsModule,
    UsageModule,
    ModelQuotasModule,
    ModelCatalogModule,
  ],
  controllers: [AdminController],
  providers: [AdminGuard],
})
export class AdminModule {}
