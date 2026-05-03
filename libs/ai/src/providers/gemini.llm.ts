import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMConfig, SuggestResult } from '../types';
import { buildPrompt } from './_shared';

export async function geminiSuggest(
  repoName: string,
  input: string,
  cfg: LLMConfig,
): Promise<SuggestResult> {
  const genAI = new GoogleGenerativeAI(cfg.geminiApiKey!);
  const model = genAI.getGenerativeModel({
    model: cfg.geminiModel ?? 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });
  const res = await model.generateContent(buildPrompt(repoName, input));
  return JSON.parse(res.response.text());
}
