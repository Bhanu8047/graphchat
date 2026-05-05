import { Injectable } from '@nestjs/common';
import { ModelService, ModelSetting } from '@graphchat/shared-types';
import { ModelSettingsRepository } from './model-settings.repository';
import { UpsertModelSettingDto } from './dto/upsert-model-setting.dto';

@Injectable()
export class ModelSettingsService {
  constructor(private readonly repo: ModelSettingsRepository) {}

  list(userId: string): Promise<ModelSetting[]> {
    return this.repo.list(userId);
  }

  async upsert(
    userId: string,
    dto: UpsertModelSettingDto,
  ): Promise<ModelSetting> {
    const record: ModelSetting = {
      userId,
      service: dto.service,
      enabled: dto.enabled,
      provider: dto.provider,
      model: dto.model?.trim() || undefined,
      useOwnKey: dto.useOwnKey ?? false,
      updatedAt: new Date().toISOString(),
    };
    await this.repo.upsert(record);
    return record;
  }

  async findEffective(
    userId: string,
    service: ModelService,
  ): Promise<ModelSetting | null> {
    return this.repo.findOne(userId, service);
  }
}
