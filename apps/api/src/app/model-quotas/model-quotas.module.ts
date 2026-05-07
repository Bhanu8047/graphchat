import { Module } from '@nestjs/common';
import { ModelQuotasRepository } from './model-quotas.repository';
import { ModelQuotasService } from './model-quotas.service';

@Module({
  providers: [ModelQuotasService, ModelQuotasRepository],
  exports: [ModelQuotasService, ModelQuotasRepository],
})
export class ModelQuotasModule {}
