import { Injectable, NotFoundException } from '@nestjs/common';
import { ModelQuota } from '@graphchat/shared-types';
import { ModelQuotasRepository } from './model-quotas.repository';
import { UpdateModelQuotaDto } from './dto/update-model-quota.dto';

@Injectable()
export class ModelQuotasService {
  constructor(private readonly repo: ModelQuotasRepository) {}

  list(): Promise<ModelQuota[]> {
    return this.repo.list();
  }

  findById(id: string): Promise<ModelQuota | null> {
    return this.repo.findById(id);
  }

  findByProviderModel(
    provider: ModelQuota['provider'],
    modelId: string,
  ): Promise<ModelQuota | null> {
    return this.repo.findByProviderModel(provider, modelId);
  }

  /** Resolved cap = adminMonthlyUsdLimit if set, otherwise defaultMonthlyUsdLimit. */
  effectiveLimit(quota: ModelQuota): number {
    return quota.adminMonthlyUsdLimit ?? quota.defaultMonthlyUsdLimit;
  }

  async update(id: string, dto: UpdateModelQuotaDto): Promise<ModelQuota> {
    const updated = await this.repo.update(id, dto);
    if (!updated) throw new NotFoundException('Model quota not found.');
    return updated;
  }
}
