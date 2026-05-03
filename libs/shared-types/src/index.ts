export type NodeType =
  | 'module'
  | 'api'
  | 'schema'
  | 'entry'
  | 'config'
  | 'note';
export type AgentType = 'claude' | 'gpt' | 'gemini' | 'all';
export type EmbeddingProvider = 'voyage' | 'openai' | 'gemini' | 'ollama';
export type LLMProvider =
  | 'claude'
  | 'openai'
  | 'gemini'
  | 'ollama'
  | 'openrouter';
export type GraphNodeType = 'repo' | 'directory' | 'file' | NodeType;
export type GraphEdgeType =
  | 'contains'
  | 'summarizes'
  | 'references'
  | 'updates';
export type AuthProvider = 'local' | 'github';
export type ThemeMode = 'light' | 'dark' | 'system';

export const VECTOR_DIMENSION = 1024;

export interface RepositorySyncState {
  strategy: 'github-tree-sha-diff' | 'manual';
  autoUpdate: boolean;
  lastSyncedAt?: string;
  lastSourceRef?: string;
  lastSyncStatus?: 'idle' | 'syncing' | 'error';
  fileCount: number;
  nodeCount: number;
  edgeCount: number;
  reusedPaths?: number;
  seededFromRepoId?: string;
  changedPaths?: string[];
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  authProvider: AuthProvider;
  themePreference: ThemeMode;
  githubLogin?: string;
  githubId?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthenticatedUser extends AppUser {}

export interface AuthSessionResponse {
  authenticated: boolean;
  user?: AuthenticatedUser;
}

export interface DashboardRecentRepo {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  techStack: string[];
  branch?: string;
  nodes: number;
}

export interface DashboardStats {
  totals: {
    repositories: number;
    graphs: number;
    graphNodes: number;
    graphEdges: number;
    semanticNodes: number;
  };
  recentRepositories: DashboardRecentRepo[];
}

export interface GithubRepoSource {
  provider: 'github';
  owner: string;
  repo: string;
  fullName: string;
  url: string;
  branch: string;
  defaultBranch: string;
  isPrivate: boolean;
}

export interface GithubBranchListResponse {
  fullName: string;
  defaultBranch: string;
  branches: string[];
}

export interface ContextNode {
  id: string;
  ownerId: string;
  repoId: string;
  type: NodeType;
  label: string;
  content: string;
  tags: string[];
  sourcePath?: string;
  fileDigest?: string;
  chunkIndex?: number;
  totalChunks?: number;
  embedding?: number[];
  updatedAt: string;
}

export interface GraphNode {
  id: string;
  ownerId: string;
  repoId: string;
  type: GraphNodeType;
  label: string;
  path?: string;
  parentId?: string;
  depth: number;
  digest?: string;
  tags: string[];
  updatedAt: string;
}

export interface GraphEdge {
  id: string;
  ownerId: string;
  repoId: string;
  sourceId: string;
  targetId: string;
  type: GraphEdgeType;
  label?: string;
  updatedAt: string;
}

export interface GraphSnapshot {
  repository: Repository;
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    structuralNodeCount: number;
    semanticNodeCount: number;
    edgeCount: number;
  };
}

export interface Repository {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  techStack: string[];
  agent: AgentType;
  source?: GithubRepoSource;
  sync?: RepositorySyncState;
  nodes: ContextNode[];
  createdAt: string;
  updatedAt: string;
}

export interface VectorSearchResult {
  node: Omit<ContextNode, 'embedding'>;
  repoId: string;
  score: number;
}

export interface AgentExportPayload {
  repository: Pick<Repository, 'name' | 'description' | 'techStack' | 'agent'>;
  contextMap: Record<
    NodeType,
    Array<Omit<ContextNode, 'id' | 'repoId' | 'embedding'>>
  >;
  vectorIndex: Array<{
    id: string;
    type: NodeType;
    label: string;
    tags: string[];
  }>;
  graph?: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    sync?: RepositorySyncState;
  };
  agentHint: string;
  meta: { totalNodes: number; lastUpdated: string; format: string };
}

export interface SuggestResult {
  type: NodeType;
  label: string;
  content: string;
  tags: string[];
}

export interface CreateRepoDto {
  name: string;
  description: string;
  techStack: string[];
  agent: AgentType;
}

export interface ImportGithubRepoDto {
  url: string;
  accessToken?: string;
  branch?: string;
  agent?: AgentType;
}

export interface CreateNodeDto {
  repoId: string;
  type: NodeType;
  label: string;
  content: string;
  tags: string[];
}

export interface SearchQueryDto {
  q: string;
  repoId?: string;
  type?: NodeType;
  k?: number;
}

export interface GraphSyncDto {
  accessToken?: string;
  force?: boolean;
  seedRepoId?: string;
}

export interface SuggestDto {
  repoId: string;
  input: string;
}

export interface RuntimeProviderConfig {
  llmProviders: LLMProvider[];
  defaultLlmProvider?: LLMProvider;
  embeddingProviders: EmbeddingProvider[];
  defaultEmbeddingProvider?: EmbeddingProvider;
  agentOptions: AgentType[];
  defaultAgent?: AgentType;
}
