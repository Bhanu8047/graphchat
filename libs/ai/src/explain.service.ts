import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { LLMConfig } from './types';

/**
 * Generate a free-form natural-language explanation of a node, given its
 * label, content, and the labels of the most-related neighboring nodes.
 *
 * Returns a plain string (no JSON envelope) so the caller can stream or
 * print it directly.
 */
export async function explainContextNode(
  repoName: string,
  node: { label: string; type: string; content: string },
  related: Array<{ label: string; type: string }>,
  cfg: LLMConfig,
): Promise<string> {
  const prompt = buildExplainPrompt(repoName, node, related);

  switch (cfg.provider) {
    case 'claude': {
      const client = new Anthropic({ apiKey: cfg.anthropicApiKey });
      const msg = await client.messages.create({
        model: cfg.claudeModel ?? 'claude-sonnet-4-5-20250929',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      });
      return msg.content
        .map((c) => (c.type === 'text' ? c.text : ''))
        .join('')
        .trim();
    }
    case 'openai': {
      const client = new OpenAI({ apiKey: cfg.openaiApiKey });
      const res = await client.chat.completions.create({
        model: cfg.openaiModel ?? 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
      });
      return (res.choices[0].message.content ?? '').trim();
    }
    case 'openrouter': {
      const client = new OpenAI({
        apiKey: cfg.openrouterApiKey,
        baseURL: 'https://openrouter.ai/api/v1',
      });
      const res = await client.chat.completions.create({
        model: cfg.openrouterModel ?? 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
      });
      return (res.choices[0].message.content ?? '').trim();
    }
    case 'gemini': {
      // Use a thin REST call via OpenAI-compatible endpoint if available; fall
      // back to a minimal description if no Gemini SDK is wired.
      throw new Error(
        'Gemini explain not yet wired — set provider=claude or openai in Settings.',
      );
    }
    case 'ollama': {
      const base = cfg.ollamaBaseUrl ?? 'http://localhost:11434';
      const res = await fetch(`${base}/api/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: cfg.ollamaModel ?? 'llama3.1',
          prompt,
          stream: false,
        }),
      });
      const data = (await res.json()) as { response?: string };
      return (data.response ?? '').trim();
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
