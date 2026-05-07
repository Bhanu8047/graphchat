import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MongoVectorService,
  RedisVectorService,
} from '@graphchat/vector-client';
import { getEmbeddingsWithUsage, EmbeddingConfig } from '@graphchat/ai';
import {
  ContextNode,
  CreateNodeDto,
  CredentialKind,
  EmbeddingProvider,
} from '@graphchat/shared-types';
import { v4 as uuid } from 'uuid';
import { RuntimeConfigService } from '../runtime/runtime-config.service';
import { SearchService } from '../search/search.service';
import { UsageService } from '../usage/usage.service';

@Injectable()
export class NodesService implements OnModuleInit {
  private mongo: MongoVectorService;
  private redis: RedisVectorService;
  private embedCfg: EmbeddingConfig;

  constructor(
    cfg: ConfigService,
    private runtimeConfig: RuntimeConfigService,
    private searchService: SearchService,
    private readonly usage: UsageService,
  ) {
    const defaultProvider =
      this.runtimeConfig.getDefaultEmbeddingProvider() ??
      cfg.get<EmbeddingProvider>('EMBEDDING_PROVIDER', 'gemini');
    this.mongo = new MongoVectorService(cfg.get('MONGODB_URI'));
    this.redis = new RedisVectorService();
    this.embedCfg = {
      provider: defaultProvider,
      voyageApiKey: cfg.get('VOYAGE_API_KEY'),
      voyageBaseUrl: cfg.get('VOYAGE_BASE_URL'),
      voyageModel: cfg.get('VOYAGE_MODEL', 'voyage-code-3') as any,
      openaiApiKey: cfg.get('OPENAI_API_KEY'),
      geminiApiKey: cfg.get('GEMINI_API_KEY'),
      ollamaBaseUrl: cfg.get('OLLAMA_BASE_URL'),
      ollamaEmbedModel: cfg.get('OLLAMA_EMBED_MODEL'),
    };
  }

  async onModuleInit() {
    await this.mongo.connect();
    await this.redis.connect();
  }

  async create(dto: CreateNodeDto, ownerId: string): Promise<ContextNode> {
    const repo = await this.mongo.getRepoForOwner(dto.repoId, ownerId);
    if (!repo) {
      throw new NotFoundException(`Repo ${dto.repoId} not found`);
    }

    const node: ContextNode = {
      id: uuid(),
      ownerId,
      updatedAt: new Date().toISOString(),
      confidence: dto.confidence ?? 'INFERRED',
      ...dto,
    };
    const text = `${node.label} ${node.content} ${node.tags.join(' ')}`;
    const { vectors, usage, provider, model } = await getEmbeddingsWithUsage(
      [text],
      this.embedCfg,
    );
    const [embedding] = vectors;
    if (provider !== 'lexical') {
      await this.usage.recordModelUsage({
        userId: ownerId,
        provider: provider as CredentialKind,
        modelId: model,
        inputTokens: usage.inputTokens,
        callType: 'embedding',
      });
    }
    await Promise.all([
      this.mongo.saveNode(node, embedding),
      this.redis.storeNode(node, embedding),
    ]);
    await this.searchService.invalidateCache({
      ownerId,
      repoId: node.repoId,
    });
    return node;
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const node = await this.mongo.getNodeByIdForOwner(id, ownerId);
    if (!node) {
      throw new NotFoundException(`Node ${id} not found`);
    }

    await Promise.all([this.mongo.deleteNode(id), this.redis.deleteNode(id)]);
    await this.searchService.invalidateCache({
      ownerId,
      repoId: node.repoId,
    });
  }
}
