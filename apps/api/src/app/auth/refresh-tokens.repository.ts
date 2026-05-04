import { Injectable, OnModuleInit } from '@nestjs/common';
import { Collection } from 'mongodb';
import { RefreshTokenRecord } from '@vectorgraph/shared-types';
import { MongoDatabaseService } from '../common/database/mongo-database.service';

@Injectable()
export class RefreshTokensRepository implements OnModuleInit {
  private collection!: Collection<RefreshTokenRecord>;

  constructor(private readonly database: MongoDatabaseService) {}

  async onModuleInit() {
    this.collection =
      this.database.collection<RefreshTokenRecord>('refresh_tokens');
    await this.collection.createIndex({ tokenHash: 1 }, { unique: true });
    // TTL — Mongo auto-deletes expired tokens.
    await this.collection.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 },
    );
  }

  create(record: RefreshTokenRecord) {
    return this.collection.insertOne(record).then(() => record);
  }

  findByHash(tokenHash: string) {
    return this.collection.findOne({ tokenHash }, { projection: { _id: 0 } });
  }

  deleteByHash(tokenHash: string) {
    return this.collection.deleteOne({ tokenHash });
  }

  deleteByApiKey(apiKeyId: string) {
    return this.collection.deleteMany({ apiKeyId });
  }
}
