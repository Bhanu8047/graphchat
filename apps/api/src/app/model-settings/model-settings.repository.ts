import { Injectable, OnModuleInit } from '@nestjs/common';
import { Collection } from 'mongodb';
import { ModelSetting } from '@trchat/shared-types';
import { MongoDatabaseService } from '../common/database/mongo-database.service';

@Injectable()
export class ModelSettingsRepository implements OnModuleInit {
  private collection!: Collection<ModelSetting>;

  constructor(private readonly database: MongoDatabaseService) {}

  async onModuleInit() {
    this.collection = this.database.collection<ModelSetting>('model_settings');
    await this.collection.createIndex(
      { userId: 1, service: 1 },
      { unique: true },
    );
  }

  list(userId: string) {
    return this.collection
      .find({ userId }, { projection: { _id: 0 } })
      .toArray();
  }

  upsert(setting: ModelSetting) {
    return this.collection.findOneAndUpdate(
      { userId: setting.userId, service: setting.service },
      { $set: setting },
      { upsert: true, returnDocument: 'after', projection: { _id: 0 } },
    );
  }

  findOne(userId: string, service: ModelSetting['service']) {
    return this.collection.findOne(
      { userId, service },
      { projection: { _id: 0 } },
    );
  }
}
