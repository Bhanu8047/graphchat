import { Module } from '@nestjs/common';
import { ModelSettingsController } from './model-settings.controller';
import { ModelSettingsRepository } from './model-settings.repository';
import { ModelSettingsService } from './model-settings.service';

@Module({
  controllers: [ModelSettingsController],
  providers: [ModelSettingsService, ModelSettingsRepository],
  exports: [ModelSettingsService],
})
export class ModelSettingsModule {}
