import { Injectable, OnModuleInit } from '@nestjs/common';
import { Collection } from 'mongodb';
import {
  CredentialKind,
  ModelUsageRecord,
  UsageRecord,
} from '@graphchat/shared-types';
import { MongoDatabaseService } from '../common/database/mongo-database.service';

@Injectable()
export class UsageRepository implements OnModuleInit {
  private collection!: Collection<UsageRecord>;
  private modelUsage!: Collection<ModelUsageRecord>;

  constructor(private readonly database: MongoDatabaseService) {}

  async onModuleInit() {
    this.collection = this.database.collection<UsageRecord>('usage_records');
    await this.collection.createIndex(
      { userId: 1, service: 1, provider: 1, model: 1, day: 1 },
      { unique: true },
    );
    await this.collection.createIndex({ day: 1 });

    this.modelUsage = this.database.collection<ModelUsageRecord>('model_usage');
    await this.modelUsage.createIndex({ id: 1 }, { unique: true });
    await this.modelUsage.createIndex({
      userId: 1,
      provider: 1,
      modelId: 1,
      createdAt: 1,
    });
  }

  // ── Cost-based model usage ────────────────────────────────────────────────
  insertModelUsage(record: ModelUsageRecord) {
    return this.modelUsage.insertOne({ ...record });
  }

  updateModelUsage(
    id: string,
    patch: Partial<
      Pick<
        ModelUsageRecord,
        'inputTokens' | 'outputTokens' | 'estimatedUsdCost'
      >
    >,
  ) {
    return this.modelUsage.updateOne({ id }, { $set: patch });
  }

  async sumMonthlyCost(
    userId: string,
    provider: CredentialKind,
    modelId: string,
    monthStartIso: string,
    monthEndIso: string,
  ): Promise<number> {
    const doc = await this.modelUsage
      .aggregate<{ total: number }>([
        {
          $match: {
            userId,
            provider,
            modelId,
            createdAt: { $gte: monthStartIso, $lt: monthEndIso },
          },
        },
        { $group: { _id: null, total: { $sum: '$estimatedUsdCost' } } },
        { $project: { _id: 0, total: 1 } },
      ])
      .next();
    return doc?.total ?? 0;
  }

  modelUsageBreakdown(
    userId: string,
    monthStartIso: string,
    monthEndIso: string,
  ) {
    return this.modelUsage
      .aggregate<{
        _id: { provider: CredentialKind; modelId: string };
        usedUsd: number;
        inputTokens: number;
        outputTokens: number;
        callCount: number;
      }>([
        {
          $match: {
            userId,
            createdAt: { $gte: monthStartIso, $lt: monthEndIso },
          },
        },
        {
          $group: {
            _id: { provider: '$provider', modelId: '$modelId' },
            usedUsd: { $sum: '$estimatedUsdCost' },
            inputTokens: { $sum: '$inputTokens' },
            outputTokens: { $sum: '$outputTokens' },
            callCount: { $sum: 1 },
          },
        },
      ])
      .toArray();
  }

  modelUsageAggregate(filter: {
    userId?: string;
    provider?: CredentialKind;
    monthStartIso?: string;
    monthEndIso?: string;
  }) {
    const match: Record<string, unknown> = {};
    if (filter.userId) match.userId = filter.userId;
    if (filter.provider) match.provider = filter.provider;
    if (filter.monthStartIso || filter.monthEndIso) {
      const range: Record<string, string> = {};
      if (filter.monthStartIso) range.$gte = filter.monthStartIso;
      if (filter.monthEndIso) range.$lt = filter.monthEndIso;
      match.createdAt = range;
    }
    return this.modelUsage
      .aggregate<{
        _id: {
          userId: string;
          provider: CredentialKind;
          modelId: string;
        };
        usedUsd: number;
        inputTokens: number;
        outputTokens: number;
        callCount: number;
      }>([
        { $match: match },
        {
          $group: {
            _id: {
              userId: '$userId',
              provider: '$provider',
              modelId: '$modelId',
            },
            usedUsd: { $sum: '$estimatedUsdCost' },
            inputTokens: { $sum: '$inputTokens' },
            outputTokens: { $sum: '$outputTokens' },
            callCount: { $sum: 1 },
          },
        },
        { $sort: { '_id.userId': 1, '_id.provider': 1, '_id.modelId': 1 } },
      ])
      .toArray();
  }

  increment(
    record: Omit<UsageRecord, 'id' | 'count' | 'updatedAt'> & {
      count: number;
      tokens: number;
    },
  ) {
    return this.collection.updateOne(
      {
        userId: record.userId,
        service: record.service,
        provider: record.provider,
        model: record.model,
        day: record.day,
      },
      {
        $setOnInsert: {
          id: `${record.userId}:${record.service}:${record.provider}:${record.model}:${record.day}`,
        },
        $inc: { count: record.count, tokens: record.tokens },
        $set: { updatedAt: new Date().toISOString() },
      },
      { upsert: true },
    );
  }

  countToday(userId: string, service: UsageRecord['service'], day: string) {
    return this.collection
      .aggregate<{ total: number }>([
        { $match: { userId, service, day } },
        { $group: { _id: null, total: { $sum: '$count' } } },
        { $project: { _id: 0, total: 1 } },
      ])
      .next()
      .then((doc) => doc?.total ?? 0);
  }

  countSince(
    userId: string,
    service: UsageRecord['service'],
    sinceIso: string,
  ) {
    return this.collection
      .aggregate<{ total: number }>([
        { $match: { userId, service, updatedAt: { $gte: sinceIso } } },
        { $group: { _id: null, total: { $sum: '$count' } } },
        { $project: { _id: 0, total: 1 } },
      ])
      .next()
      .then((doc) => doc?.total ?? 0);
  }

  listForUser(userId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    return this.collection
      .find({ userId, day: { $gte: since } }, { projection: { _id: 0 } })
      .sort({ day: -1 })
      .toArray();
  }

  listAll(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    return this.collection
      .find({ day: { $gte: since } }, { projection: { _id: 0 } })
      .sort({ day: -1 })
      .toArray();
  }
}
