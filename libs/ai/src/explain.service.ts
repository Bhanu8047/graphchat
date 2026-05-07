import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { LLMConfig, LLMResponse } from './types';

/**
 * Generate a free-form natural-language explanation of a node, given its
 * label, content, and the labels of the most-related neighboring nodes.
 *
 * Returns the explanation alongside SDK-reported token usage and the resolved
 * model id so callers can record cost.
 */
export async function explainContextNode(
  repoName: string,
  node: { label: string; type: string; content: string },
  related: Array<{ label: string; type: string }>,
  cfg: LLMConfig,
): Promise<LLMResponse<string>> {
  const prompt = buildExplainPrompt(repoName, node, related);

  switch (cfg.provider) {
    case 'claude': {
      const client = new Anthropic({ apiKey: cfg.anthropicApiKey });
      const model = cfg.claudeModel ?? 'claude-sonnet-4-5-20250929';
      const msg = await client.messages.create({
        model,
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = msg.content
        .map((c) => (c.type === 'text' ? c.text : ''))
        .join('')
        .trim();
      return {
        result: text,
        usage: {
          inputTokens: msg.usage?.input_tokens ?? 0,
          outputTokens: msg.usage?.output_tokens ?? 0,
        },
        model,
      };
    }
    case 'openai': {
      const client = new OpenAI({ apiKey: cfg.openaiApiKey });
      const model = cfg.openaiModel ?? 'gpt-4o-mini';
      const res = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
      });
      return {
        result: (res.choices[0].message.content ?? '').trim(),
        usage: {
          inputTokens: res.usage?.prompt_tokens ?? 0,
          outputTokens: res.usage?.completion_tokens ?? 0,
        },
        model,
      };
    }
    case 'openrouter': {
      const client = new OpenAI({
        apiKey: cfg.openrouterApiKey,
        baseURL: 'https://openrouter.ai/api/v1',
      });
      const model = cfg.openrouterModel ?? 'openai/gpt-4o-mini';
      const res = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
      });
      return {
        result: (res.choices[0].message.content ?? '').trim(),
        usage: {
          inputTokens: res.usage?.prompt_tokens ?? 0,
          outputTokens: res.usage?.completion_tokens ?? 0,
        },
        model,
      };
    }
    case 'gemini': {
      throw new Error(
        'Gemini explain not yet wired — set provider=claude or openai in Settings.',
      );
    }
    case 'ollama': {
      const base = cfg.ollamaBaseUrl ?? 'http://localhost:11434';
      const model = cfg.ollamaModel ?? 'llama3.1';
      const res = await fetch(`${base}/api/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model, prompt, stream: false }),
      });
      const data = (await res.json()) as {
        response?: string;
        prompt_eval_count?: number;
        eval_count?: number;
      };
      return {
        result: (data.response ?? '').trim(),
        usage: {
          inputTokens: data.prompt_eval_count ?? 0,
          outputTokens: data.eval_count ?? 0,
        },
        model,
      };
    }
    default:
      throw new Error(`Unknown LLM provider: ${cfg.provider}`);
  }
}

function buildExplainPrompt(
  repoName: string,
  node: { label: string; type: string; content: string },
  related: Array<{ label: string; type: string }>,
): string {
  const relatedBlock = related.length
    ? related.map((r) => `- ${r.label} (${r.type})`).join('\n')
    : '- (none)';
  return `You are explaining a code/architecture node from the repository "${repoName}" to a developer who is unfamiliar with it.

Node: ${node.label} (${node.type})
Content:
${node.content}

Related nodes:
${relatedBlock}

Write 2–4 short paragraphs in plain prose. Cover:
1) What this node represents and its role in the codebase.
2) How it relates to the listed neighbors (only those that are clearly relevant).
3) Any caveats or things a new contributor should know.

Do NOT use markdown headings or bullet lists. Do NOT repeat the node label as a title.`;
}
