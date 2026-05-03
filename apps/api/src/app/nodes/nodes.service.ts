import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoVectorService, RedisVectorService } from '@vectorgraph/vector-client';
import { getEmbedding, EmbeddingConfig } from '@vectorgraph/ai';
import { ContextNode, CreateNodeDto, EmbeddingProvider } from '@vectorgraph/shared-types';
import { v4 as uuid } from 'uuid';

@Injectable()
export class NodesService implements OnModuleInit {
  private mongo: MongoVectorService;
  private redis: RedisVectorService;
  private embedCfg: EmbeddingConfig;

  constructor(private cfg: ConfigService) {
    this.mongo = new MongoVectorService(cfg.get('MONGODB_URI'));
    this.redis = new RedisVectorService();
    this.embedCfg = {
      provider:      cfg.get<EmbeddingProvider>('EMBEDDING_PROVIDER', 'voyage'),
      voyageApiKey:  cfg.get('VOYAGE_API_KEY'),
      voyageModel:   cfg.get('VOYAGE_MODEL', 'voyage-code-3') as any,
      openaiApiKey:  cfg.get('OPENAI_API_KEY'),
      geminiApiKey:  cfg.get('GEMINI_API_KEY'),
      ollamaBaseUrl: cfg.get('OLLAMA_BASE_URL'),
      ollamaEmbedModel: cfg.get('OLLAMA_EMBED_MODEL'),
    };
  }

  async onModuleInit() {
    await this.mongo.connect();
    await this.redis.connect();
  }

  async create(dto: CreateNodeDto): Promise<ContextNode> {
    const node: ContextNode = {
      id: uuid(),
      updatedAt: new Date().toISOString(),
      ...dto,
    };
    const text = `${node.label} ${node.content} ${node.tags.join(' ')}`;
    const embedding = await getEmbedding(text, this.embedCfg);
    await Promise.all([
      this.mongo.saveNode(node, embedding),
      this.redis.storeNode(node, embedding),
    ]);
    return node;
  }

  async remove(id: string): Promise<void> {
    await Promise.all([
      this.mongo.deleteNode(id),
      this.redis.deleteNode(id),
    ]);
  }
}
