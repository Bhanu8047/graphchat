import { Injectable, OnModuleInit } from '@nestjs/common';
import { Collection } from 'mongodb';
import { ModelCatalog } from '@graphchat/shared-types';
import { MongoDatabaseService } from '../common/database/mongo-database.service';

type SeedRow = Omit<ModelCatalog, 'id' | 'createdAt' | 'isVisibleToUsers'>;

const SEEDS: SeedRow[] = [
  {
    provider: 'claude',
    modelId: 'claude-opus-4-20250514',
    displayName: 'Claude Opus 4',
    contextWindow: 200000,
  },
  {
    provider: 'claude',
    modelId: 'claude-sonnet-4-20250514',
    displayName: 'Claude Sonnet 4',
    contextWindow: 200000,
  },
  {
    provider: 'claude',
    modelId: 'claude-haiku-4-5',
    displayName: 'Claude Haiku 4.5',
    contextWindow: 200000,
  },
  {
    provider: 'openai',
    modelId: 'gpt-4o',
    displayName: 'GPT-4o',
    contextWindow: 128000,
  },
  {
    provider: 'openai',
    modelId: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    contextWindow: 128000,
  },
  {
    provider: 'openai',
    modelId: 'o3',
    displayName: 'OpenAI o3',
    contextWindow: 200000,
  },
  {
    provider: 'openai',
    modelId: 'o4-mini',
    displayName: 'OpenAI o4 Mini',
    contextWindow: 200000,
  },
  {
    provider: 'gemini',
    modelId: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    contextWindow: 1000000,
  },
  {
    provider: 'gemini',
    modelId: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    contextWindow: 1000000,
  },
];

// Default quota limits for auto-created quota rows when a model is enabled
export const DEFAULT_QUOTA: Record<
  string,
  { costPer1kTokens: number; defaultMonthlyUsdLimit: number }
> = {
  'claude:claude-sonnet-4-20250514': {
    costPer1kTokens: 0.003,
    defaultMonthlyUsdLimit: 10.0,
  },
  'claude:claude-haiku-4-5': {
    costPer1kTokens: 0.0008,
    defaultMonthlyUsdLimit: 5.0,
  },
  'openai:gpt-4o': { costPer1kTokens: 0.005, defaultMonthlyUsdLimit: 10.0 },
  'openai:gpt-4o-mini': {
    costPer1kTokens: 0.00015,
    defaultMonthlyUsdLimit: 5.0,
  },
  'gemini:gemini-2.0-flash': {
    costPer1kTokens: 0.0001,
    defaultMonthlyUsdLimit: 5.0,
  },
};

@Injectable()
export class ModelCatalogRepository implements OnModuleInit {
  private collection!: Collection<ModelCatalog>;

  constructor(private readonly database: MongoDatabaseService) {}

  async onModuleInit() {
    this.collection = this.database.collection<ModelCatalog>('model_catalog');
    await this.collection.createIndex(
      { provider: 1, modelId: 1 },
      { unique: true },
    );
    const now = new Date().toISOString();
    for (const seed of SEEDS) {
      await this.collection.updateOne(
        { provider: seed.provider, modelId: seed.modelId },
        {
          $setOnInsert: {
            id: `mc:${seed.provider}:${seed.modelId}`,
            ...seed,
            isVisibleToUsers: false,
            createdAt: now,
          },
        },
        { upsert: true },
      );
    }
  }

  list() {
    return this.collection
      .find({}, { projection: { _id: 0 } })
      .sort({ provider: 1, modelId: 1 })
      .toArray();
  }

  listVisible() {
    return this.collection
      .find({ isVisibleToUsers: true }, { projection: { _id: 0 } })
      .sort({ provider: 1, modelId: 1 })
      .toArray();
  }

  findById(id: string) {
    return this.collection.findOne({ id }, { projection: { _id: 0 } });
  }

  async updateVisibility(id: string, isVisibleToUsers: boolean) {
    const result = await this.collection.findOneAndUpdate(
      { id },
      { $set: { isVisibleToUsers } },
      { returnDocument: 'after', projection: { _id: 0 } },
    );
    return result;
  }

  async bulkUpdateVisibility(ids: string[], isVisibleToUsers: boolean) {
    await this.collection.updateMany(
      { id: { $in: ids } },
      { $set: { isVisibleToUsers } },
    );
    return this.collection
      .find({ id: { $in: ids } }, { projection: { _id: 0 } })
      .toArray();
  }
}
