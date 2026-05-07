import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMConfig, LLMResponse, SuggestResult } from '../types';
import { buildPrompt } from './_shared';

export async function geminiSuggest(
  repoName: string,
  input: string,
  cfg: LLMConfig,
): Promise<LLMResponse<SuggestResult>> {
  const genAI = new GoogleGenerativeAI(cfg.geminiApiKey!);
  const modelId = cfg.geminiModel ?? 'gemini-2.0-flash';
  const model = genAI.getGenerativeModel({
    model: modelId,
    generationConfig: { responseMimeType: 'application/json' },
  });
  const res = await model.generateContent(buildPrompt(repoName, input));
  const result = JSON.parse(res.response.text()) as SuggestResult;
  const meta = res.response.usageMetadata;
  return {
    result,
    usage: {
      inputTokens: meta?.promptTokenCount ?? 0,
      outputTokens: meta?.candidatesTokenCount ?? 0,
    },
    model: modelId,
  };
}
