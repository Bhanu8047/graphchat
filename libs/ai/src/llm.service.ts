import { LLMConfig, LLMResponse, SuggestResult } from './types';
import { claudeSuggest } from './providers/claude.llm';
import { openaiSuggest } from './providers/openai.llm';
import { geminiSuggest } from './providers/gemini.llm';
import { ollamaSuggest } from './providers/ollama.llm';

export async function suggestContextNode(
  repoName: string,
  input: string,
  cfg: LLMConfig,
): Promise<LLMResponse<SuggestResult>> {
  switch (cfg.provider) {
    case 'claude':
      return claudeSuggest(repoName, input, cfg);
    case 'openai':
      return openaiSuggest(repoName, input, cfg);
    case 'gemini':
      return geminiSuggest(repoName, input, cfg);
    case 'ollama':
    case 'openrouter':
      return ollamaSuggest(repoName, input, cfg);
    default:
      throw new Error(`Unknown LLM provider: ${cfg.provider}`);
  }
}
