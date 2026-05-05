import { Injectable } from '@nestjs/common';
import {
  CredentialKind,
  ModelService,
  UsageRecord,
} from '@graphchat/shared-types';
import { UsageRepository } from './usage.repository';

const todayUTC = () => new Date().toISOString().slice(0, 10);

@Injectable()
export class UsageService {
  constructor(private readonly repo: UsageRepository) {}

  /** Record a single operation. `tokens` is best-effort; pass 0 if unknown. */
  record(
    userId: string,
    service: ModelService,
    provider: CredentialKind,
    model: string,
    tokens = 0,
  ) {
    return this.repo.increment({
      userId,
      service,
      provider,
      model: model || 'unknown',
      day: todayUTC(),
      count: 1,
      tokens,
    });
  }

  countToday(userId: string, service: ModelService) {
    return this.repo.countToday(userId, service, todayUTC());
  }

  countLastHour(userId: string, service: ModelService) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    return this.repo.countSince(userId, service, since);
  }

  listForUser(userId: string): Promise<UsageRecord[]> {
    return this.repo.listForUser(userId);
  }

  listAll(): Promise<UsageRecord[]> {
    return this.repo.listAll();
  }
}
