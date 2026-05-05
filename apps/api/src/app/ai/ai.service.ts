import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { explainContextNode, suggestContextNode } from '@graphchat/ai';
import {
  ExplainDto,
  ExplainResponse,
  SuggestDto,
} from '@graphchat/shared-types';
import { MongoVectorService } from '@graphchat/vector-client';
import { AiResolverService } from '../ai-resolver/ai-resolver.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private mongo: MongoVectorService;

  constructor(
    cfg: ConfigService,
    private readonly resolver: AiResolverService,
  ) {
    this.mongo = new MongoVectorService(cfg.get('MONGODB_URI'));
  }

  async suggest(dto: SuggestDto, ownerId: string) {
    if (!dto?.repoId || !dto?.input?.trim()) {
      throw new HttpException(
        'repoId and input are required for AI assist.',
        400,
      );
    }
    await this.resolver.enforceRateLimit(ownerId, 'ai-assist');
    await this.mongo.connect();
    const repo = await this.mongo.getRepoForOwner(dto.repoId, ownerId);
    if (!repo) {
      throw new NotFoundException(`Repo ${dto.repoId} not found`);
    }
    const cfg = await this.resolver.resolveLlmConfig(ownerId);
    try {
      const result = await suggestContextNode(repo.name, dto.input, cfg);
      void this.resolver.recordUsage(
        ownerId,
        'ai-assist',
        cfg.provider,
        cfg.model,
      );
      return result;
    } catch (err) {
      const e = err as Error;
      this.logger.error(
        `AI suggest failed (provider=${cfg.provider}, model=${cfg.model}): ${e.message}`,
        e.stack,
      );
      // Re-throw HttpException as-is, otherwise wrap with a useful message
      // so the client sees the underlying cause instead of a bare 500.
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException(
        `AI provider error (${cfg.provider}): ${e.message}`,
      );
    }
  }

  async explain(dto: ExplainDto, ownerId: string): Promise<ExplainResponse> {
    if (!dto?.repoId || !dto?.label?.trim()) {
      throw new HttpException(
        'repoId and label are required for explain.',
        400,
      );
    }
    await this.resolver.enforceRateLimit(ownerId, 'ai-assist');
    await this.mongo.connect();
    const repo = await this.mongo.getRepoForOwner(dto.repoId, ownerId);
    if (!repo) {
      throw new NotFoundException(`Repo ${dto.repoId} not found`);
    }
    const node = await this.mongo.findNodeByLabelForOwner(
      dto.repoId,
      dto.label,
      ownerId,
    );
    if (!node) {
      throw new NotFoundException(
        `No node found with label "${dto.label}" in repo ${dto.repoId}`,
      );
    }
    const neighbors = await this.mongo.getContextNeighbors(
      dto.repoId,
      node.id,
      8,
    );
    const related = neighbors.map((n) => ({ label: n.label, type: n.type }));

    const cfg = await this.resolver.resolveLlmConfig(ownerId);
    try {
      const explanation = await explainContextNode(
        repo.name,
        { label: node.label, type: node.type, content: node.content },
        related,
        cfg,
      );
      void this.resolver.recordUsage(
        ownerId,
        'ai-assist',
        cfg.provider,
        cfg.model,
      );
      return { label: node.label, type: node.type, explanation, related };
    } catch (err) {
      const e = err as Error;
      this.logger.error(
        `AI explain failed (provider=${cfg.provider}, model=${cfg.model}): ${e.message}`,
        e.stack,
      );
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException(
        `AI provider error (${cfg.provider}): ${e.message}`,
      );
    }
  }
}
