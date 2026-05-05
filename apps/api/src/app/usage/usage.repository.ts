import { Injectable, OnModuleInit } from '@nestjs/common';
import { Collection } from 'mongodb';
import { UsageRecord } from '@trchat/shared-types';
import { MongoDatabaseService } from '../common/database/mongo-database.service';

@Injectable()
export class UsageRepository implements OnModuleInit {
  private collection!: Collection<UsageRecord>;

  constructor(private readonly database: MongoDatabaseService) {}

  async onModuleInit() {
    this.collection = this.database.collection<UsageRecord>('usage_records');
    await this.collection.createIndex(
      { userId: 1, service: 1, provider: 1, model: 1, day: 1 },
      { unique: true },
    );
    await this.collection.createIndex({ day: 1 });
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
