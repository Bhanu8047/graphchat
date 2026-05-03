import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AgentType,
  EmbeddingProvider,
  LLMProvider,
  RuntimeProviderConfig,
} from '@vectorgraph/shared-types';

@Injectable()
export class RuntimeConfigService {
  constructor(private cfg: ConfigService) {}

  getPublicConfig(): RuntimeProviderConfig {
    const llmProviders = this.getAvailableLlmProviders();
    const embeddingProviders = this.getAvailableEmbeddingProviders();
    const agentOptions = this.getAvailableAgents(llmProviders);

    return {
      llmProviders,
      defaultLlmProvider: this.getDefaultLlmProvider(),
      embeddingProviders,
      defaultEmbeddingProvider: this.getDefaultEmbeddingProvider(),
      agentOptions,
      defaultAgent: this.getDefaultAgent(agentOptions),
    };
  }

  getAvailableLlmProviders(): LLMProvider[] {
    const providers: LLMProvider[] = [];
    if (this.cfg.get('ANTHROPIC_API_KEY')) providers.push('claude');
    if (this.cfg.get('OPENAI_API_KEY')) providers.push('openai');
    if (this.cfg.get('GEMINI_API_KEY')) providers.push('gemini');
    if (this.cfg.get('OLLAMA_BASE_URL')) providers.push('ollama');
    if (this.cfg.get('OPENROUTER_API_KEY')) providers.push('openrouter');
    return providers;
  }

  getAvailableEmbeddingProviders(): EmbeddingProvider[] {
    const providers: EmbeddingProvider[] = [];
    if (this.cfg.get('VOYAGE_API_KEY')) providers.push('voyage');
    if (this.cfg.get('OPENAI_API_KEY')) providers.push('openai');
    if (this.cfg.get('GEMINI_API_KEY')) providers.push('gemini');
    if (this.cfg.get('OLLAMA_BASE_URL')) providers.push('ollama');
    return providers;
  }

  getDefaultLlmProvider(): LLMProvider | undefined {
    const available = this.getAvailableLlmProviders();
    const preferred = this.cfg.get<LLMProvider>('LLM_PROVIDER');
    if (preferred && available.includes(preferred)) return preferred;
    return available[0];
  }

  getDefaultEmbeddingProvider(): EmbeddingProvider | undefined {
    const available = this.getAvailableEmbeddingProviders();
    const preferred = this.cfg.get<EmbeddingProvider>('EMBEDDING_PROVIDER');
    if (preferred && available.includes(preferred)) return preferred;
    return available[0];
  }

  getAvailableAgents(
    llmProviders = this.getAvailableLlmProviders(),
  ): AgentType[] {
    const agentOptions: AgentType[] = [];
    if (llmProviders.includes('claude')) agentOptions.push('claude');
    if (llmProviders.includes('openai')) agentOptions.push('gpt');
    if (llmProviders.includes('gemini')) agentOptions.push('gemini');
    if (
      (llmProviders.length > 1 && agentOptions.length > 0) ||
      (llmProviders.length > 0 && agentOptions.length === 0)
    ) {
      agentOptions.push('all');
    }
    return agentOptions;
  }

  getDefaultAgent(
    agentOptions = this.getAvailableAgents(),
  ): AgentType | undefined {
    const defaultLlm = this.getDefaultLlmProvider();
    const mapped = defaultLlm
      ? this.mapLlmProviderToAgent(defaultLlm)
      : undefined;
    if (mapped && agentOptions.includes(mapped)) return mapped;
    return agentOptions[0];
  }

  private mapLlmProviderToAgent(provider: LLMProvider): AgentType | undefined {
    switch (provider) {
      case 'claude':
        return 'claude';
      case 'openai':
        return 'gpt';
      case 'gemini':
        return 'gemini';
      default:
        return undefined;
    }
  }
}
