export type NodeType    = 'module' | 'api' | 'schema' | 'entry' | 'config' | 'note';
export type AgentType   = 'claude' | 'gpt' | 'gemini' | 'all';
export type EmbeddingProvider = 'voyage' | 'openai' | 'gemini' | 'ollama';
export type LLMProvider       = 'claude' | 'openai' | 'gemini' | 'ollama' | 'openrouter';

export const VECTOR_DIMENSION = 1024;

export interface GithubRepoSource {
  provider:      'github';
  owner:         string;
  repo:          string;
  fullName:      string;
  url:           string;
  defaultBranch: string;
  isPrivate:     boolean;
}

export interface ContextNode {
  id:         string;
  repoId:     string;
  type:       NodeType;
  label:      string;
  content:    string;
  tags:       string[];
  embedding?: number[];
  updatedAt:  string;
}

export interface Repository {
  id:          string;
  name:        string;
  description: string;
  techStack:   string[];
  agent:       AgentType;
  source?:     GithubRepoSource;
  nodes:       ContextNode[];
  createdAt:   string;
  updatedAt:   string;
}

export interface VectorSearchResult {
  node:   Omit<ContextNode, 'embedding'>;
  repoId: string;
  score:  number;
}

export interface AgentExportPayload {
  repository:  Pick<Repository, 'name' | 'description' | 'techStack' | 'agent'>;
  contextMap:  Record<NodeType, Array<Omit<ContextNode, 'id' | 'repoId' | 'embedding'>>>;
  vectorIndex: Array<{ id: string; type: NodeType; label: string; tags: string[] }>;
  agentHint:   string;
  meta:        { totalNodes: number; lastUpdated: string; format: string };
}

export interface SuggestResult {
  type:    NodeType;
  label:   string;
  content: string;
  tags:    string[];
}

export interface CreateRepoDto {
  name:        string;
  description: string;
  techStack:   string[];
  agent:       AgentType;
}

export interface ImportGithubRepoDto {
  url:         string;
  accessToken?: string;
  agent?:      AgentType;
}

export interface CreateNodeDto {
  repoId:  string;
  type:    NodeType;
  label:   string;
  content: string;
  tags:    string[];
}

export interface SearchQueryDto {
  q:       string;
  repoId?: string;
  type?:   NodeType;
  k?:      number;
}

export interface SuggestDto {
  repoId: string;
  input:  string;
}

export interface RuntimeProviderConfig {
  llmProviders: LLMProvider[];
  defaultLlmProvider?: LLMProvider;
  embeddingProviders: EmbeddingProvider[];
  defaultEmbeddingProvider?: EmbeddingProvider;
  agentOptions: AgentType[];
  defaultAgent?: AgentType;
}
