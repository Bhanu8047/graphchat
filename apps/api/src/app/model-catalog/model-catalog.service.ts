import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AvailableModel,
  ModelCatalog,
  ModelUsageSummary,
} from '@graphchat/shared-types';
import {
  ModelCatalogRepository,
  DEFAULT_QUOTA,
} from './model-catalog.repository';
import { ModelQuotasRepository } from '../model-quotas/model-quotas.repository';
import {
  UpdateCatalogVisibilityDto,
  BulkUpdateCatalogDto,
} from './dto/update-catalog.dto';

@Injectable()
export class ModelCatalogService {
  constructor(
    private readonly repo: ModelCatalogRepository,
    private readonly quotasRepo: ModelQuotasRepository,
  ) {}

  list() {
    return this.repo.list();
  }

  async updateVisibility(
    id: string,
    dto: UpdateCatalogVisibilityDto,
  ): Promise<ModelCatalog> {
    const updated = await this.repo.updateVisibility(id, dto.isVisibleToUsers);
    if (!updated) throw new NotFoundException('Model catalog entry not found.');
    if (dto.isVisibleToUsers) {
      await this.ensureQuota(updated);
    }
    return updated;
  }

  async bulkUpdateVisibility(
    dto: BulkUpdateCatalogDto,
  ): Promise<ModelCatalog[]> {
    const updated = await this.repo.bulkUpdateVisibility(
      dto.ids,
      dto.isVisibleToUsers,
    );
    if (dto.isVisibleToUsers) {
      await Promise.all(updated.map((m) => this.ensureQuota(m)));
    }
    return updated;
  }

  async getAvailableModels(
    usageSummaries: ModelUsageSummary[],
  ): Promise<AvailableModel[]> {
    const visible = await this.repo.listVisible();
    const usageMap = new Map(
      usageSummaries.map((s) => [`${s.provider}:${s.modelId}`, s]),
    );

    return visible.map((m) => {
      const usage = usageMap.get(`${m.provider}:${m.modelId}`);
      return {
        provider: m.provider,
        modelId: m.modelId,
        displayName: m.displayName,
        contextWindow: m.contextWindow,
        usedUsd: usage?.usedUsd ?? 0,
        remainingUsd: usage?.remainingUsd ?? usage?.limitUsd ?? 0,
        limitUsd: usage?.limitUsd ?? 0,
      };
    });
  }

  private async ensureQuota(model: ModelCatalog) {
    const defaults = DEFAULT_QUOTA[`${model.provider}:${model.modelId}`] ?? {
      costPer1kTokens: 0.001,
      defaultMonthlyUsdLimit: 5.0,
    };
    await this.quotasRepo.ensureExists(
      model.provider as any,
      model.modelId,
      defaults,
    );
  }
}
