import { Injectable, OnModuleInit } from '@nestjs/common';
import { Collection } from 'mongodb';
import { ApiKey } from '@vectorgraph/shared-types';
import { MongoDatabaseService } from '../common/database/mongo-database.service';

@Injectable()
export class ApiKeysRepository implements OnModuleInit {
  private collection!: Collection<ApiKey>;

  constructor(private readonly database: MongoDatabaseService) {}

  async onModuleInit() {
    this.collection = this.database.collection<ApiKey>('api_keys');
    await this.collection.createIndex({ keyId: 1 }, { unique: true });
    await this.collection.createIndex({ userId: 1 });
  }

  create(key: ApiKey) {
    return this.collection.insertOne(key).then(() => key);
  }

  findByKeyId(keyId: string) {
    return this.collection.findOne({ keyId }, { projection: { _id: 0 } });
  }

  findById(id: string) {
    return this.collection.findOne({ id }, { projection: { _id: 0 } });
  }

  listByUser(userId: string) {
    return this.collection
      .find({ userId }, { projection: { _id: 0, secretHash: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async touch(id: string): Promise<void> {
    await this.collection.updateOne(
      { id },
      { $set: { lastUsed: new Date().toISOString() } },
    );
  }

  delete(id: string, userId: string) {
    return this.collection.deleteOne({ id, userId });
  }
}
