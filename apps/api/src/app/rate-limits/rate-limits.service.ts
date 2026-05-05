import { Injectable, NotFoundException } from '@nestjs/common';
import { ModelService, RateLimit } from '@trchat/shared-types';
import { UpsertRateLimitDto } from './dto/upsert-rate-limit.dto';
import { RateLimitsRepository } from './rate-limits.repository';

@Injectable()
export class RateLimitsService {
  constructor(private readonly repo: RateLimitsRepository) {}

  list(): Promise<RateLimit[]> {
    return this.repo.list();
  }

  async findByService(service: ModelService): Promise<RateLimit | null> {
    return this.repo.findByService(service);
  }

  async upsert(adminId: string, dto: UpsertRateLimitDto): Promise<RateLimit> {
    const existing = await this.repo.findByService(dto.service);
    const record: RateLimit = {
      id: existing?.id ?? `rl:${dto.service}`,
      service: dto.service,
      dailyLimit: dto.dailyLimit,
      sessionLimit: dto.sessionLimit,
      updatedAt: new Date().toISOString(),
      updatedBy: adminId,
    };
    const updated = await this.repo.upsert(record);
    if (!updated) throw new NotFoundException('Rate limit not found.');
    return record;
  }
}
