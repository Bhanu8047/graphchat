import {
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingConfig, LLMConfig } from '@graphchat/ai';
import {
  CredentialKind,
  EmbeddingProvider,
  LLMProvider,
  ModelService,
} from '@graphchat/shared-types';
import { CredentialsService } from '../credentials/credentials.service';
import { ModelSettingsService } from '../model-settings/model-settings.service';
import { RateLimitsService } from '../rate-limits/rate-limits.service';
import { RuntimeConfigService } from '../runtime/runtime-config.service';
import { UsageService } from '../usage/usage.service';

/**
 * Single source of truth for "what model + which key + is the user allowed
 * to use it right now?". Every consumer (AiService, SearchService, ingestion
 * pipelines) should go through here so SOLID/DRY hold.
 */
@Injectable()
export class AiResolverService {
  private readonly logger = new Logger(AiResolverService.name);

  constructor(
    private readonly cfg: ConfigService,
    private readonly runtime: RuntimeConfigService,
    private readonly settings: ModelSettingsService,
    private readonly credentials: CredentialsService,
    private readonly usage: UsageService,
    private readonly rateLimits: RateLimitsService,
  ) {}

  /** Throws 429 when the user exceeds the admin-configured caps. */
  async enforceRateLimit(userId: string, service: ModelService): Promise<void> {
    const limit = await this.rateLimits.findByService(service);
    if (!limit) return;
    if (limit.dailyLimit > 0) {
      const today = await this.usage.countToday(userId, service);
      if (today >= limit.dailyLimit) {
        throw new HttpException(
          `Daily ${service} quota reached (${limit.dailyLimit}). Try again tomorrow or contact an admin.`,
          429,
        );
      }
    }
    if (limit.sessionLimit > 0) {
      const lastHour = await this.usage.countLastHour(userId, service);
      if (lastHour >= limit.sessionLimit) {
        throw new HttpException(
          `Hourly ${service} quota reached (${limit.sessionLimit}). Cool down and retry shortly.`,
          429,
        );
      }
    }
  }

  /** Record a single op against the user's usage ledger. */
  recordUsage(
    userId: string,
    service: ModelService,
    provider: CredentialKind,
    model: string,
    tokens = 0,
  ) {
    return this.usage
      .record(userId, service, provider, model, tokens)
      .catch((err) =>
        this.logger.warn(`Usage record failed: ${(err as Error).message}`),
      );
  }

  async resolveLlmConfig(
    userId: string,
  ): Promise<LLMConfig & { model: string }> {
    const setting = await this.settings.findEffective(userId, 'ai-assist');
    if (setting && setting.enabled === false) {
      throw new ForbiddenException(
        'AI assist is disabled for your account. Enable it in Settings → Models.',
      );
    }
    const provider =
      (setting?.provider as LLMProvider | undefined) ??
      this.runtime.getDefaultLlmProvider() ??
      this.cfg.get<LLMProvider>('LLM_PROVIDER', 'gemini');
    const ownKey =
      setting?.useOwnKey === true
        ? await this.credentials.resolveSecret(userId, provider)
        : null;

    const cfg: LLMConfig = {
      provider,
      anthropicApiKey:
        provider === 'claude' && ownKey
          ? ownKey
          : this.cfg.get('ANTHROPIC_API_KEY'),
      claudeModel:
        (provider === 'claude' ? setting?.model : undefined) ??
        this.cfg.get('CLAUDE_MODEL', 'claude-sonnet-4-5-20250929'),
      openaiApiKey:
        provider === 'openai' && ownKey
          ? ownKey
          : this.cfg.get('OPENAI_API_KEY'),
      openaiModel:
        (provider === 'openai' ? setting?.model : undefined) ??
        this.cfg.get('OPENAI_MODEL', 'gpt-4o-mini'),
      geminiApiKey:
        provider === 'gemini' && ownKey
          ? ownKey
          : this.cfg.get('GEMINI_API_KEY'),
      geminiModel:
        (provider === 'gemini' ? setting?.model : undefined) ??
        this.cfg.get('GEMINI_MODEL', 'gemini-2.0-flash'),
      ollamaBaseUrl: this.cfg.get('OLLAMA_BASE_URL', 'http://localhost:11434'),
      ollamaModel:
        (provider === 'ollama' ? setting?.model : undefined) ??
        this.cfg.get('OLLAMA_MODEL', 'llama3.2'),
      openrouterApiKey:
        provider === 'openrouter' && ownKey
          ? ownKey
          : this.cfg.get('OPENROUTER_API_KEY'),
      openrouterModel:
        (provider === 'openrouter' ? setting?.model : undefined) ??
        this.cfg.get(
          'OPENROUTER_MODEL',
          'meta-llama/llama-3.1-8b-instruct:free',
        ),
    };

    const model = this.modelOf(cfg);
    return { ...cfg, model };
  }

  async resolveEmbeddingConfig(
    userId: string,
  ): Promise<EmbeddingConfig & { model: string }> {
    const setting = await this.settings.findEffective(userId, 'embedding');
    if (setting && setting.enabled === false) {
      throw new ForbiddenException(
        'Embeddings are disabled for your account. Enable them in Settings → Models.',
      );
    }
    const provider =
      (setting?.provider as EmbeddingProvider | undefined) ??
      this.runtime.getDefaultEmbeddingProvider() ??
      this.cfg.get<EmbeddingProvider>('EMBEDDING_PROVIDER', 'gemini');
    const ownKey =
      setting?.useOwnKey === true
        ? await this.credentials.resolveSecret(userId, provider)
        : null;

    const cfg: EmbeddingConfig = {
      provider,
      voyageApiKey:
        provider === 'voyage' && ownKey
          ? ownKey
          : this.cfg.get('VOYAGE_API_KEY'),
      voyageBaseUrl: this.cfg.get('VOYAGE_BASE_URL'),
      voyageModel: this.cfg.get<string>(
        'VOYAGE_MODEL',
        'voyage-code-3',
      ) as EmbeddingConfig['voyageModel'],
      openaiApiKey:
        provider === 'openai' && ownKey
          ? ownKey
          : this.cfg.get('OPENAI_API_KEY'),
      geminiApiKey:
        provider === 'gemini' && ownKey
          ? ownKey
          : this.cfg.get('GEMINI_API_KEY'),
      ollamaBaseUrl: this.cfg.get('OLLAMA_BASE_URL'),
      ollamaEmbedModel: this.cfg.get('OLLAMA_EMBED_MODEL'),
    };
    const model =
      setting?.model ??
      (provider === 'voyage'
        ? (cfg.voyageModel ?? 'voyage-code-3')
        : provider === 'openai'
          ? 'text-embedding-3-small'
          : provider === 'gemini'
            ? 'text-embedding-004'
            : (cfg.ollamaEmbedModel ?? 'nomic-embed-text'));
    return { ...cfg, model };
  }

  private modelOf(cfg: LLMConfig): string {
    switch (cfg.provider) {
      case 'claude':
        return cfg.claudeModel ?? 'claude';
      case 'openai':
        return cfg.openaiModel ?? 'openai';
      case 'gemini':
        return cfg.geminiModel ?? 'gemini';
      case 'ollama':
        return cfg.ollamaModel ?? 'ollama';
      case 'openrouter':
        return cfg.openrouterModel ?? 'openrouter';
      default:
        return cfg.provider;
    }
  }
}
