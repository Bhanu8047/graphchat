import { Injectable, OnModuleInit } from '@nestjs/common';
import { Collection } from 'mongodb';
import { ModelQuota } from '@graphchat/shared-types';
import { MongoDatabaseService } from '../common/database/mongo-database.service';

type SeedRow = Pick<
  ModelQuota,
  'provider' | 'modelId' | 'costPer1kTokens' | 'defaultMonthlyUsdLimit'
>;

const SEEDS: SeedRow[] = [
  // Inference
  {
    provider: 'claude',
    modelId: 'claude-sonnet-4-20250514',
    costPer1kTokens: 0.003,
    defaultMonthlyUsdLimit: 10.0,
  },
  {
    provider: 'claude',
    modelId: 'claude-haiku-4-5',
    costPer1kTokens: 0.0008,
    defaultMonthlyUsdLimit: 5.0,
  },
  {
    provider: 'openai',
    modelId: 'gpt-4o',
    costPer1kTokens: 0.005,
    defaultMonthlyUsdLimit: 10.0,
  },
  {
    provider: 'openai',
    modelId: 'gpt-4o-mini',
    costPer1kTokens: 0.00015,
    defaultMonthlyUsdLimit: 5.0,
  },
  {
    provider: 'gemini',
    modelId: 'gemini-2.0-flash',
    costPer1kTokens: 0.0001,
    defaultMonthlyUsdLimit: 5.0,
  },
  // Embeddings (provider names match CredentialKind/EmbeddingProvider enum:
  // 'voyage' rather than the spec's 'voyageai')
  {
    provider: 'voyage',
    modelId: 'voyage-code-3',
    costPer1kTokens: 0.00018,
    defaultMonthlyUsdLimit: 5.0,
  },
  {
    provider: 'openai',
    modelId: 'text-embedding-3-small',
    costPer1kTokens: 0.00002,
    defaultMonthlyUsdLimit: 2.0,
  },
  {
    provider: 'gemini',
    modelId: 'text-embedding-004',
    costPer1kTokens: 0.0,
    defaultMonthlyUsdLimit: 2.0,
  },
];

@Injectable()
export class ModelQuotasRepository implements OnModuleInit {
  private collection!: Collection<ModelQuota>;

  constructor(private readonly database: MongoDatabaseService) {}

  async onModuleInit() {
    this.collection = this.database.collection<ModelQuota>('model_quotas');
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
            id: `mq:${seed.provider}:${seed.modelId}`,
            ...seed,
            adminMonthlyUsdLimit: null,
            isActive: true,
            createdAt: now,
            updatedAt: now,
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

  findById(id: string) {
    return this.collection.findOne({ id }, { projection: { _id: 0 } });
  }

  findByProviderModel(provider: ModelQuota['provider'], modelId: string) {
    return this.collection.findOne(
      { provider, modelId },
      { projection: { _id: 0 } },
    );
  }

  async ensureExists(
    provider: ModelQuota['provider'],
    modelId: string,
    defaults: Pick<ModelQuota, 'costPer1kTokens' | 'defaultMonthlyUsdLimit'>,
  ) {
    const now = new Date().toISOString();
    await this.collection.updateOne(
      { provider, modelId },
      {
        $setOnInsert: {
          id: `mq:${provider}:${modelId}`,
          provider,
          modelId,
          costPer1kTokens: defaults.costPer1kTokens,
          defaultMonthlyUsdLimit: defaults.defaultMonthlyUsdLimit,
          adminMonthlyUsdLimit: null,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
  }

  async update(
    id: string,
    patch: Partial<Pick<ModelQuota, 'adminMonthlyUsdLimit' | 'isActive'>>,
  ) {
    const result = await this.collection.findOneAndUpdate(
      { id },
      { $set: { ...patch, updatedAt: new Date().toISOString() } },
      { returnDocument: 'after', projection: { _id: 0 } },
    );
    return result;
  }
}
