import { Injectable, OnModuleInit } from '@nestjs/common';
import { Collection } from 'mongodb';
import { RateLimit } from '@graphchat/shared-types';
import { MongoDatabaseService } from '../common/database/mongo-database.service';

const DEFAULTS: Omit<RateLimit, 'updatedAt' | 'updatedBy'>[] = [
  {
    id: 'rl:ai-assist',
    service: 'ai-assist',
    dailyLimit: 100,
    sessionLimit: 30,
  },
  {
    id: 'rl:embedding',
    service: 'embedding',
    dailyLimit: 1000,
    sessionLimit: 200,
  },
];

@Injectable()
export class RateLimitsRepository implements OnModuleInit {
  private collection!: Collection<RateLimit>;

  constructor(private readonly database: MongoDatabaseService) {}

  async onModuleInit() {
    this.collection = this.database.collection<RateLimit>('rate_limits');
    await this.collection.createIndex({ service: 1 }, { unique: true });
    const now = new Date().toISOString();
    for (const def of DEFAULTS) {
      await this.collection.updateOne(
        { service: def.service },
        {
          $setOnInsert: { ...def, updatedAt: now, updatedBy: 'system' },
        },
        { upsert: true },
      );
    }
  }

  list() {
    return this.collection
      .find({}, { projection: { _id: 0 } })
      .sort({ service: 1 })
      .toArray();
  }

  findByService(service: RateLimit['service']) {
    return this.collection.findOne({ service }, { projection: { _id: 0 } });
  }

  upsert(record: RateLimit) {
    return this.collection.findOneAndUpdate(
      { service: record.service },
      { $set: record },
      { upsert: true, returnDocument: 'after', projection: { _id: 0 } },
    );
  }
}
