import { Module } from '@nestjs/common';
import { ModelCatalogRepository } from './model-catalog.repository';
import { ModelCatalogService } from './model-catalog.service';
import { ModelCatalogController } from './model-catalog.controller';
import { ModelQuotasModule } from '../model-quotas/model-quotas.module';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [ModelQuotasModule, UsageModule],
  controllers: [ModelCatalogController],
  providers: [ModelCatalogService, ModelCatalogRepository],
  exports: [ModelCatalogService],
})
export class ModelCatalogModule {}
