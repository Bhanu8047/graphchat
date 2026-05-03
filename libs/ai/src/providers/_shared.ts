import { SuggestResult } from '@vectorgraph/shared-types';

export function buildPrompt(repoName: string, input: string): string {
  return `You are structuring repository context for AI agents.
For repository "${repoName}", return ONLY valid JSON — no markdown, no explanation:

{
  "type": "module" | "api" | "schema" | "entry" | "config" | "note",
  "label": "short descriptive name (max 30 chars)",
  "content": "detailed 2–4 sentence description of what this is and how it works",
  "tags": ["tag1", "tag2", "tag3"]
}

Input:
${input}`;
}

export function parseJSON(raw: string): SuggestResult {
  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}
