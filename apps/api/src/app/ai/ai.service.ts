import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { suggestContextNode, LLMConfig } from '@vectorgraph/ai';
import { SuggestDto, LLMProvider } from '@vectorgraph/shared-types';
import { MongoVectorService } from '@vectorgraph/vector-client';
import { RuntimeConfigService } from '../runtime/runtime-config.service';

@Injectable()
export class AiService {
  private llmCfg: LLMConfig;
  private mongo: MongoVectorService;
  constructor(
    private cfg: ConfigService,
    private runtimeConfig: RuntimeConfigService,
  ) {
    const defaultProvider =
      this.runtimeConfig.getDefaultLlmProvider() ??
      cfg.get<LLMProvider>('LLM_PROVIDER', 'gemini');
    this.mongo = new MongoVectorService(cfg.get('MONGODB_URI'));
    this.llmCfg = {
      provider: defaultProvider,
      anthropicApiKey: cfg.get('ANTHROPIC_API_KEY'),
      claudeModel: cfg.get('CLAUDE_MODEL', 'claude-sonnet-4-20250514'),
      openaiApiKey: cfg.get('OPENAI_API_KEY'),
      openaiModel: cfg.get('OPENAI_MODEL', 'gpt-4o-mini'),
      geminiApiKey: cfg.get('GEMINI_API_KEY'),
      geminiModel: cfg.get('GEMINI_MODEL', 'gemini-2.0-flash'),
      ollamaBaseUrl: cfg.get('OLLAMA_BASE_URL', 'http://localhost:11434'),
      ollamaModel: cfg.get('OLLAMA_MODEL', 'llama3.2'),
      openrouterApiKey: cfg.get('OPENROUTER_API_KEY'),
      openrouterModel: cfg.get(
        'OPENROUTER_MODEL',
        'meta-llama/llama-3.1-8b-instruct:free',
      ),
    };
  }

  async suggest(dto: SuggestDto, ownerId: string) {
    await this.mongo.connect();
    const repo = await this.mongo.getRepoForOwner(dto.repoId, ownerId);
    if (!repo) {
      throw new NotFoundException(`Repo ${dto.repoId} not found`);
    }

    return suggestContextNode(repo.name, dto.input, this.llmCfg);
  }
}
