import { Injectable, OnModuleInit } from '@nestjs/common';
import { Collection } from 'mongodb';
import { ProviderCredential } from '@graphchat/shared-types';
import { MongoDatabaseService } from '../common/database/mongo-database.service';

@Injectable()
export class CredentialsRepository implements OnModuleInit {
  private collection!: Collection<ProviderCredential>;

  constructor(private readonly database: MongoDatabaseService) {}

  async onModuleInit() {
    this.collection = this.database.collection<ProviderCredential>(
      'provider_credentials',
    );
    await this.collection.createIndex(
      { userId: 1, provider: 1 },
      { unique: true },
    );
  }

  upsert(record: ProviderCredential) {
    return this.collection.findOneAndUpdate(
      { userId: record.userId, provider: record.provider },
      { $set: record },
      { upsert: true, returnDocument: 'after', projection: { _id: 0 } },
    );
  }

  findById(id: string, userId: string) {
    return this.collection.findOne({ id, userId }, { projection: { _id: 0 } });
  }

  findByProvider(userId: string, provider: ProviderCredential['provider']) {
    return this.collection.findOne(
      { userId, provider },
      { projection: { _id: 0 } },
    );
  }

  list(userId: string) {
    return this.collection
      .find({ userId }, { projection: { _id: 0, cipherText: 0 } })
      .sort({ provider: 1 })
      .toArray();
  }

  delete(id: string, userId: string) {
    return this.collection.deleteOne({ id, userId });
  }
}
