export type NodeType =
  // Original
  | 'module'
  | 'api'
  | 'schema'
  | 'entry'
  | 'config'
  | 'note'
  // AST-extracted (Priority 2)
  | 'function'
  | 'class'
  | 'import'
  | 'rationale'
  | 'interface'
  | 'sql_table'
  | 'sql_relation'
  // Graph-analysis (Priority 2)
  | 'community'
  | 'god_node';

// ── Edge types (Priority 2) ───────────────────────────────────────────────────
export type EdgeType =
  | 'calls'
  | 'imports'
  | 'implements'
  | 'rationale_for'
  | 'semantically_similar_to'
  | 'depends_on'
  | 'tested_by'
  | 'described_by'
  | 'belongs_to_community';

// ── Confidence tiers (Priority 1) ─────────────────────────────────────────────
// EXTRACTED: fact from AST (confidence 1.0) — zero LLM, zero network
// INFERRED:  LLM/embedding inference (confidence 0.6–0.9)
// SPECULATIVE: low-confidence guess (confidence < 0.6)
export type EdgeConfidence = 'EXTRACTED' | 'INFERRED' | 'SPECULATIVE';
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

export type AuthenticatedUser = AppUser;

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
  // Priority 1 + 2 — token minimization & graph
  confidence?: EdgeConfidence;
  sourceFile?: string;
  sourceLine?: number;
  communityId?: string;
}

// ── ContextEdge (Priority 2 — distinct from structural GraphEdge) ─────────────
export interface ContextEdge {
  id: string;
  ownerId?: string;
  repoId: string;
  sourceId: string;
  targetId: string;
  type: EdgeType;
  confidence: EdgeConfidence;
  weight: number;
  createdAt: string;
}

export interface Community {
  id: string;
  ownerId?: string;
  repoId: string;
  label: string;
  nodeIds: string[];
  godNodeId: string;
  cachedPrompt?: string;
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
  // Priority 2 — absolute path on the host that triggers AST graph analysis
  repoPath?: string;
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
  // Priority 1 — defaults to 'INFERRED' when added via UI
  confidence?: EdgeConfidence;
  sourceFile?: string;
  sourceLine?: number;
}

export interface SearchQueryDto {
  q: string;
  repoId?: string;
  type?: NodeType;
  k?: number;
  // Priority 1 — token budget (max output tokens) and confidence floor
  budget?: number;
  minConfidence?: EdgeConfidence;
}

// ── Graph sidecar DTOs (Priority 2) ───────────────────────────────────────────
export interface AnalyzeRepoDto {
  repoId: string;
  repoPath: string;
  languages?: string[];
}

export interface AnalyzeRepoResult {
  repoId: string;
  nodesAdded: number;
  edgesAdded: number;
  communities: number;
  godNodes: string[];
  durationMs: number;
}

export interface GraphQueryDto {
  repoId: string;
  query: string;
  mode?: 'bfs' | 'dfs' | 'knn';
  budget?: number;
  hops?: number;
}

export interface CommunityMeta {
  id: string;
  repoId: string;
  label: string;
  godNodeId: string;
  nodeCount: number;
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

// ── CLI auth (sk-trchat-... API keys + JWT exchange) ──────────────────────────
export interface ApiKey {
  id: string;
  keyId: string; // public prefix (24 hex chars)
  secretHash: string; // hashed secret (64 hex chars unhashed)
  userId: string;
  label: string; // human label e.g. "My Laptop", "CI Pipeline"
  scopes: string[]; // e.g. ['read', 'write', 'analyze']
  lastUsed?: string;
  createdAt: string;
}

export interface ApiKeySummary {
  id: string;
  keyId: string;
  label: string;
  scopes: string[];
  lastUsed?: string;
  createdAt: string;
}

export interface RefreshTokenRecord {
  tokenHash: string; // hashed opaque token
  userId: string;
  apiKeyId: string;
  expiresAt: Date;
  createdAt: string;
}

export interface ApiTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  token_type: 'Bearer';
}

export interface ApiAccessTokenPayload {
  sub: string; // userId
  apiKeyId: string;
  scopes: string[];
  iat?: number;
  exp?: number;
}
