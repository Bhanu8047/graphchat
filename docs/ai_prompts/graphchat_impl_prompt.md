# GRAPHCHAT — Agent Implementation Prompt
## Priority 1 & 2: Token Minimization + Python Graph Sidecar

> **Read this entire document before writing a single line of code.**
> This builds on the existing NX monorepo at `vectorgraph/` (NestJS API, Next.js web, shared libs).
> All decisions are final. Implement in the exact order defined in the Build Order section.
> Do not refactor existing working code unless explicitly instructed.

---

## 0. Current State of the Codebase

The monorepo already has:

```
vectorgraph/
├── apps/
│   ├── api/          NestJS :3001 — repos, nodes, search, ai, export modules
│   └── web/          Next.js :3000 — 5-tab UI
├── libs/
│   ├── shared-types/ ContextNode, Repository, VectorSearchResult, DTOs
│   ├── vector-client/ RedisVectorService, MongoVectorService
│   └── ai/           multi-provider embedding + LLM factories
├── docker/           api.Dockerfile, web.Dockerfile, nginx/nginx.conf
├── docker-compose.yml         (Redis Stack + MongoDB, local dev)
└── docker-compose.prod.yml    (full prod stack)
```

**What we are adding:**

```
Priority 1 — Token minimization inside existing NestJS + shared libs
  - .graphchatignore support
  - Edge confidence tiers (EXTRACTED / INFERRED / SPECULATIVE)
  - --budget query param on search
  - Community context Redis cache

Priority 2 — Python graph sidecar (new Docker container)
  - FastAPI graph-service on port 5000
  - Tree-sitter AST extraction for 10 languages
  - NetworkX graph construction
  - Leiden community detection (graspologic)
  - NestJS → graph-service HTTP bridge (GraphModule)
```

---

## 1. Updated Shared Types

**File: `libs/shared-types/src/index.ts`**
Replace the entire file with this. Existing types are preserved and extended.

```typescript
// ── Base enums ────────────────────────────────────────────────────────────────
export type AgentType   = 'claude' | 'gpt' | 'gemini' | 'all';
export type EmbeddingProvider = 'voyage' | 'openai' | 'gemini' | 'ollama';
export type LLMProvider = 'claude' | 'openai' | 'gemini' | 'ollama' | 'openrouter';

// ── Node types (extended from 6 → 14) ────────────────────────────────────────
export type NodeType =
  // Original
  | 'module' | 'api' | 'schema' | 'entry' | 'config' | 'note'
  // New — from AST extraction (Priority 2)
  | 'function'   // individual function/method nodes from Tree-sitter
  | 'class'      // class-level nodes from Tree-sitter
  | 'import'     // import/dependency anchors from Tree-sitter
  | 'rationale'  // docstrings, # WHY:, # NOTE:, # HACK: from Tree-sitter
  // New — from graph analysis (Priority 2)
  | 'community'  // Leiden community summary node
  | 'god_node'   // highest-degree node in a community
  | 'interface'  // TypeScript/Go interfaces from Tree-sitter
  | 'sql_table'  // from SQL AST extraction
  | 'sql_relation'; // FK relationships from SQL AST

// ── Edge types (NEW) ─────────────────────────────────────────────────────────
export type EdgeType =
  | 'calls'                   // A calls B (EXTRACTED)
  | 'imports'                 // A imports B (EXTRACTED)
  | 'implements'              // A implements B (EXTRACTED)
  | 'rationale_for'           // comment/docstring explains node (EXTRACTED)
  | 'semantically_similar_to' // vector similarity (INFERRED)
  | 'depends_on'              // general dependency (INFERRED)
  | 'tested_by'               // test → source (INFERRED)
  | 'described_by'            // source → doc (INFERRED)
  | 'belongs_to_community';   // node → community (COMPUTED)

// ── Confidence tiers (NEW — Priority 1) ──────────────────────────────────────
// EXTRACTED: fact from AST, confidence 1.0 — zero LLM calls, zero network
// INFERRED:  LLM/embedding inference, confidence 0.6–0.9
// SPECULATIVE: low-confidence guess, confidence < 0.6
export type EdgeConfidence = 'EXTRACTED' | 'INFERRED' | 'SPECULATIVE';

// ── Core entities ─────────────────────────────────────────────────────────────
export interface ContextNode {
  id:          string;
  repoId:      string;
  type:        NodeType;
  label:       string;
  content:     string;
  tags:        string[];
  embedding?:  number[];    // 1024 dims — NEVER send to frontend, strip on read
  updatedAt:   string;      // ISO string
  // New fields (Priority 1 + 2)
  confidence?: EdgeConfidence;  // how was this node produced?
  sourceFile?: string;          // file path it was extracted from
  sourceLine?: number;          // line number in source file
  communityId?: string;         // Leiden community this node belongs to
}

export interface ContextEdge {
  id:         string;
  repoId:     string;
  sourceId:   string;       // source node id
  targetId:   string;       // target node id
  type:       EdgeType;
  confidence: EdgeConfidence;
  weight:     number;       // 0.0–1.0
  createdAt:  string;
}

export interface Community {
  id:         string;
  repoId:     string;
  label:      string;       // auto-generated: "Auth & Token Management"
  nodeIds:    string[];
  godNodeId:  string;       // highest-degree node
  cachedPrompt?: string;    // pre-compressed context string (Redis cached)
  updatedAt:  string;
}

export interface Repository {
  id:          string;
  name:        string;
  description: string;
  techStack:   string[];
  agent:       AgentType;
  nodes:       ContextNode[];  // populated on fetch, embedding stripped
  communities?: Community[];   // populated after graph analysis
  createdAt:   string;
  updatedAt:   string;
}

export interface VectorSearchResult {
  node:   Omit<ContextNode, 'embedding'>;
  repoId: string;
  score:  number;   // 0–1, higher is better (cosine similarity)
}

export interface AgentExportPayload {
  repository:  Pick<Repository, 'name' | 'description' | 'techStack' | 'agent'>;
  contextMap:  Record<NodeType, Array<Omit<ContextNode, 'id' | 'repoId' | 'embedding'>>>;
  communities?: Array<{ id: string; label: string; godNode: string; nodeCount: number }>;
  vectorIndex: Array<{ id: string; type: NodeType; label: string; tags: string[]; confidence: EdgeConfidence }>;
  agentHint:   string;
  meta:        { totalNodes: number; totalEdges: number; communities: number; lastUpdated: string; format: string };
}

export interface SuggestResult {
  type:    NodeType;
  label:   string;
  content: string;
  tags:    string[];
}

// ── DTOs ──────────────────────────────────────────────────────────────────────
export interface CreateRepoDto {
  name:        string;
  description: string;
  techStack:   string[];
  agent:       AgentType;
}

export interface CreateNodeDto {
  repoId:      string;
  type:        NodeType;
  label:       string;
  content:     string;
  tags:        string[];
  confidence?: EdgeConfidence;  // default: 'INFERRED' (manually added via UI)
  sourceFile?: string;
  sourceLine?: number;
}

export interface SearchQueryDto {
  q:           string;
  repoId?:     string;
  type?:       NodeType;
  k?:          number;   // default: 10
  budget?:     number;   // max token count to include — filters low-confidence edges
  minConfidence?: EdgeConfidence; // filter threshold: EXTRACTED > INFERRED > SPECULATIVE
}

export interface SuggestDto {
  repoId: string;
  input:  string;
}

// ── Graph sidecar DTOs (Priority 2) ───────────────────────────────────────────
export interface AnalyzeRepoDto {
  repoId:    string;
  repoPath:  string;       // absolute path on VPS or cloned path
  languages?: string[];    // default: auto-detect from file extensions
}

export interface AnalyzeRepoResult {
  repoId:      string;
  nodesAdded:  number;
  edgesAdded:  number;
  communities: number;
  godNodes:    string[];
  durationMs:  number;
}

export interface GraphQueryDto {
  repoId:    string;
  query:     string;
  mode?:     'bfs' | 'dfs' | 'knn';   // default: 'knn'
  budget?:   number;
  hops?:     number;   // graph traversal depth (default: 2)
}
```

---

## 2. Priority 1 — Token Minimization (NestJS changes)

### 2a. .graphchatignore Support

**New file: `apps/api/src/app/shared/ignore.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import ignore from 'ignore'; // npm install ignore

@Injectable()
export class IgnoreService {
  /**
   * Build an ignore filter for a repo path.
   * Reads .graphchatignore from repo root, falls back to defaults.
   * Returns a function: (relativePath: string) => boolean (true = should ignore)
   */
  buildFilter(repoPath: string): (relativePath: string) => boolean {
    const ig = ignore();

    // Always ignore these
    ig.add([
      'node_modules/**',
      'dist/**',
      'build/**',
      '.next/**',
      'coverage/**',
      '*.generated.*',
      '*.min.js',
      '*.min.css',
      '.git/**',
      '.nx/**',
      '*.lock',
      'package-lock.json',
      'yarn.lock',
    ]);

    // Load .graphchatignore if present
    const ignorePath = join(repoPath, '.graphchatignore');
    if (existsSync(ignorePath)) {
      const raw = readFileSync(ignorePath, 'utf8');
      // Strip inline comments (vendor/ # legacy deps → vendor/)
      const lines = raw.split('\n')
        .map(l => l.replace(/#.*$/, '').trim())
        .filter(l => l.length > 0);
      ig.add(lines);
    }

    return (relativePath: string) => ig.ignores(relativePath);
  }
}
```

Install the dependency:
```bash
npm install ignore
npm install -D @types/node
```

### 2b. Edge Confidence on Search Filtering

**Update: `libs/vector-client/src/redis.service.ts`**

Add confidence filtering to the search method. Find the `search` method and replace it:

```typescript
async search(
  queryEmbedding: number[],
  options: {
    repoId?:        string;
    type?:          string;
    k?:             number;
    budget?:        number;         // NEW: max total content chars to return
    minConfidence?: string;         // NEW: 'EXTRACTED' | 'INFERRED' | 'SPECULATIVE'
  } = {}
): Promise<Array<{ node: ContextNode; score: number }>> {
  const { repoId, type, k = 10, budget, minConfidence } = options;

  const filters: string[] = [];
  if (repoId) filters.push(`@repoId:{${repoId}}`);
  if (type)   filters.push(`@type:{${type}}`);

  // Confidence filter — EXTRACTED only gets tightest queries
  if (minConfidence === 'EXTRACTED') {
    filters.push('@confidence:{EXTRACTED}');
  } else if (minConfidence === 'INFERRED') {
    filters.push('@confidence:{EXTRACTED|INFERRED}');
  }
  // SPECULATIVE: no filter (include all)

  const filter = filters.length ? filters.join(' ') : '*';
  const blob = Buffer.from(new Float32Array(queryEmbedding).buffer);

  const res = await this.client.ft.search(
    'idx:context',
    `(${filter})=>[KNN ${k} @embedding $BLOB AS __score]`,
    { PARAMS: { BLOB: blob }, DIALECT: 2, RETURN: ['$', '__score'] }
  );

  let results = res.documents.map(doc => ({
    node:  JSON.parse(doc.value['$'] as string) as ContextNode,
    score: 1 - parseFloat(doc.value['__score'] as string),
  }));

  // Budget trimming — stop adding results once char budget is reached
  if (budget) {
    let charCount = 0;
    const budgetLimit = budget * 4; // rough chars-per-token estimate
    results = results.filter(r => {
      charCount += r.node.content.length + r.node.label.length;
      return charCount <= budgetLimit;
    });
  }

  return results;
}
```

Also update `ensureIndex` to add confidence as a TAG field:

```typescript
private async ensureIndex(): Promise<void> {
  try {
    await this.client.ft.create('idx:context', {
      '$.repoId':     { type: SchemaFieldTypes.TAG,  AS: 'repoId'     },
      '$.type':       { type: SchemaFieldTypes.TAG,  AS: 'type'       },
      '$.confidence': { type: SchemaFieldTypes.TAG,  AS: 'confidence' }, // NEW
      '$.label':      { type: SchemaFieldTypes.TEXT, AS: 'label'      },
      '$.content':    { type: SchemaFieldTypes.TEXT, AS: 'content'    },
      '$.tags.*':     { type: SchemaFieldTypes.TAG,  AS: 'tags'       },
      '$.embedding':  {
        type: SchemaFieldTypes.VECTOR,
        AS: 'embedding',
        ALGORITHM: VectorAlgorithms.HNSW,
        TYPE: 'FLOAT32',
        DIM: 1024,
        DISTANCE_METRIC: 'COSINE',
      },
    }, { ON: 'JSON', PREFIX: 'context:' });
  } catch (e: any) {
    if (!e.message.includes('Index already exists')) throw e;
    // If index exists and lacks confidence field, drop and recreate:
    // await this.client.ft.dropIndex('idx:context');
    // then call ensureIndex again
  }
}
```

> ⚠️ **If Redis index already exists** without the `confidence` field, drop it once:
> `await this.client.ft.dropIndex('idx:context')` then restart — it will recreate.

### 2c. Update NodesService to Set Default Confidence

**Update: `apps/api/src/app/nodes/nodes.service.ts`**

In the `create` method, set default confidence for manually added nodes (via UI = `INFERRED`):

```typescript
async create(dto: CreateNodeDto): Promise<ContextNode> {
  const node: ContextNode = {
    id:         uuid(),
    updatedAt:  new Date().toISOString(),
    confidence: dto.confidence ?? 'INFERRED', // NEW: default for UI-added nodes
    ...dto,
  };
  const text = `${node.label} ${node.content} ${node.tags.join(' ')}`;
  const embedding = await getEmbedding(text, this.embedCfg);
  await Promise.all([
    this.mongo.saveNode(node, embedding),
    this.redis.storeNode(node, embedding),
  ]);
  return node;
}
```

### 2d. Update Search Controller to Accept Budget

**Update: `apps/api/src/app/search/search.controller.ts`**

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private svc: SearchService) {}

  @Get()
  search(
    @Query('q') q: string,
    @Query('repoId') repoId?: string,
    @Query('type') type?: string,
    @Query('k') k?: string,
    @Query('budget') budget?: string,             // NEW
    @Query('minConfidence') minConfidence?: string // NEW
  ) {
    return this.svc.search({
      q,
      repoId,
      type: type as any,
      k: k ? parseInt(k) : 10,
      budget:        budget        ? parseInt(budget)   : undefined,
      minConfidence: minConfidence as any ?? 'INFERRED',
    });
  }
}
```

**Update: `apps/api/src/app/search/search.service.ts`**

Pass the new params through:

```typescript
async search(dto: SearchQueryDto): Promise<VectorSearchResult[]> {
  const embedding = await getEmbedding(dto.q, this.embedCfg);
  const results = await this.redis.search(embedding, {
    repoId:        dto.repoId,
    type:          dto.type,
    k:             dto.k ?? 10,
    budget:        dto.budget,        // NEW
    minConfidence: dto.minConfidence, // NEW
  });
  return results.map(r => ({
    node:   r.node,
    repoId: r.node.repoId,
    score:  r.score,
  }));
}
```

### 2e. Community Context Redis Cache

**New file: `apps/api/src/app/graph/community-cache.service.ts`**

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@redis/client';
import { Community, ContextNode } from '@vectorgraph/shared-types';

const CACHE_TTL_SECONDS = 60 * 60 * 24; // 24 hours — rebuild on re-index

@Injectable()
export class CommunityCacheService implements OnModuleInit {
  private client = createClient({ url: this.cfg.get('REDIS_URL', 'redis://localhost:6379') });

  constructor(private cfg: ConfigService) {}

  async onModuleInit() {
    await this.client.connect();
  }

  /** Store a pre-compressed community context prompt in Redis */
  async setCommunityPrompt(community: Community, nodes: ContextNode[]): Promise<void> {
    const prompt = this.buildCommunityPrompt(community, nodes);
    const key = `community:${community.id}:prompt`;
    await this.client.setEx(key, CACHE_TTL_SECONDS, prompt);

    // Also store community metadata
    const metaKey = `community:${community.id}:meta`;
    await this.client.setEx(metaKey, CACHE_TTL_SECONDS, JSON.stringify({
      id:        community.id,
      repoId:    community.repoId,
      label:     community.label,
      godNodeId: community.godNodeId,
      nodeCount: community.nodeIds.length,
    }));
  }

  /** Fetch pre-built community context string */
  async getCommunityPrompt(communityId: string): Promise<string | null> {
    return this.client.get(`community:${communityId}:prompt`);
  }

  /** Get all community metadata for a repo */
  async getRepoCommunities(repoId: string): Promise<any[]> {
    const pattern = `community:*:meta`;
    const keys = await this.client.keys(pattern);
    const results = [];
    for (const key of keys) {
      const raw = await this.client.get(key);
      if (raw) {
        const meta = JSON.parse(raw);
        if (meta.repoId === repoId) results.push(meta);
      }
    }
    return results;
  }

  /** Invalidate all community cache for a repo (call on re-index) */
  async invalidateRepo(repoId: string): Promise<void> {
    const communities = await this.getRepoCommunities(repoId);
    for (const c of communities) {
      await this.client.del(`community:${c.id}:prompt`);
      await this.client.del(`community:${c.id}:meta`);
    }
  }

  private buildCommunityPrompt(community: Community, nodes: ContextNode[]): string {
    const godNode = nodes.find(n => n.id === community.godNodeId);
    const extractedNodes = nodes.filter(n => n.confidence === 'EXTRACTED');
    const inferredNodes  = nodes.filter(n => n.confidence === 'INFERRED');

    return [
      `## Community: ${community.label}`,
      `God node: ${godNode?.label ?? 'unknown'} (highest connectivity)`,
      `Nodes: ${nodes.length} total (${extractedNodes.length} AST-extracted, ${inferredNodes.length} inferred)`,
      '',
      '### AST-Extracted Nodes (confidence: EXTRACTED)',
      ...extractedNodes.slice(0, 10).map(n =>
        `- [${n.type}] ${n.label}: ${n.content.slice(0, 120)}`
      ),
      '',
      '### Inferred Nodes (confidence: INFERRED)',
      ...inferredNodes.slice(0, 5).map(n =>
        `- [${n.type}] ${n.label}: ${n.content.slice(0, 80)}`
      ),
    ].join('\n');
  }
}
```

**New file: `apps/api/src/app/graph/graph.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { CommunityCacheService } from './community-cache.service';
import { GraphBridgeService }    from './graph-bridge.service';
import { GraphController }       from './graph.controller';

@Module({
  providers: [CommunityCacheService, GraphBridgeService],
  controllers: [GraphController],
  exports: [CommunityCacheService, GraphBridgeService],
})
export class GraphModule {}
```

**Register in `app.module.ts`** — add `GraphModule` to the imports array:

```typescript
import { GraphModule } from './graph/graph.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ReposModule, NodesModule, SearchModule, AiModule, ExportModule,
    GraphModule, // NEW
  ],
})
export class AppModule {}
```

---

## 3. Priority 2 — Python Graph Sidecar

### 3a. Create the graph-service Directory

```
vectorgraph/
└── graph-service/
    ├── main.py                   FastAPI app entry
    ├── requirements.txt
    ├── core/
    │   ├── __init__.py
    │   ├── ast_extractor.py      Tree-sitter pass
    │   ├── graph_builder.py      NetworkX construction
    │   ├── leiden_clusterer.py   Leiden via graspologic
    │   ├── query_engine.py       BFS/DFS/KNN graph queries
    │   └── report_generator.py   GRAPH_REPORT.md generator
    ├── models/
    │   ├── __init__.py
    │   └── schemas.py            Pydantic request/response models
    └── tests/
        └── test_ast.py
```

### 3b. `graph-service/requirements.txt`

```text
fastapi==0.115.5
uvicorn[standard]==0.32.1
pydantic==2.9.2
networkx==3.4.2
graspologic==3.3.3
tree-sitter==0.23.2
tree-sitter-python==0.23.4
tree-sitter-typescript==0.23.2
tree-sitter-javascript==0.23.1
tree-sitter-go==0.23.4
tree-sitter-rust==0.23.2
tree-sitter-java==0.23.4
tree-sitter-c==0.23.4
tree-sitter-cpp==0.23.4
tree-sitter-ruby==0.23.1
tree-sitter-c-sharp==0.23.1
pymongo==4.10.1
redis==5.2.0
httpx==0.28.0
python-dotenv==1.0.1
```

### 3c. `graph-service/models/schemas.py`

```python
from pydantic import BaseModel, Field
from typing import Optional

class AnalyzeRequest(BaseModel):
    repo_id: str
    repo_path: str
    languages: list[str] = Field(default_factory=list)  # empty = auto-detect

class AnalyzeResponse(BaseModel):
    repo_id: str
    nodes_added: int
    edges_added: int
    communities: int
    god_nodes: list[str]
    duration_ms: int

class ClusterRequest(BaseModel):
    repo_id: str
    # Nodes/edges fetched from MongoDB by the service itself using repo_id

class ClusterResponse(BaseModel):
    repo_id: str
    communities: list[dict]   # [{id, label, node_ids, god_node_id}]
    duration_ms: int

class QueryRequest(BaseModel):
    repo_id: str
    query: str
    mode: str = 'knn'          # 'bfs' | 'dfs' | 'knn'
    budget: Optional[int] = 2000
    hops: int = 2
    # For knn: seed_node_ids passed by NestJS after vector search
    seed_node_ids: list[str] = Field(default_factory=list)

class QueryResponse(BaseModel):
    nodes: list[dict]
    edges: list[dict]
    token_estimate: int
    mode_used: str
```

### 3d. `graph-service/core/ast_extractor.py`

```python
"""
Tree-sitter AST extraction pass.
Supports: Python, TypeScript, JavaScript, Go, Rust, Java, C, C++, Ruby, C#
Zero LLM calls. Zero network calls. Source code never leaves the machine.
All extracted edges get confidence='EXTRACTED', weight=1.0
"""
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from tree_sitter import Language, Parser, Node

import tree_sitter_python     as tspython
import tree_sitter_typescript as tstypescript
import tree_sitter_javascript as tsjavascript
import tree_sitter_go         as tsgo
import tree_sitter_rust       as tsrust
import tree_sitter_java       as tsjava
import tree_sitter_c          as tsc
import tree_sitter_cpp        as tscpp
import tree_sitter_ruby       as tsruby
import tree_sitter_c_sharp    as tscsharp

# ── Language registry ─────────────────────────────────────────────────────────
LANG_MAP = {
    '.py':   Language(tspython.language()),
    '.ts':   Language(tstypescript.language_typescript()),
    '.tsx':  Language(tstypescript.language_typescript()),
    '.js':   Language(tsjavascript.language()),
    '.jsx':  Language(tsjavascript.language()),
    '.go':   Language(tsgo.language()),
    '.rs':   Language(tsrust.language()),
    '.java': Language(tsjava.language()),
    '.c':    Language(tsc.language()),
    '.h':    Language(tsc.language()),
    '.cpp':  Language(tscpp.language()),
    '.cc':   Language(tscpp.language()),
    '.rb':   Language(tsruby.language()),
    '.cs':   Language(tscsharp.language()),
}

# Default ignore patterns (augmented by .graphchatignore on NestJS side)
DEFAULT_IGNORE = {
    'node_modules', 'dist', 'build', '.next', 'coverage',
    '.git', '.nx', '__pycache__', '.pytest_cache', 'vendor',
}

RATIONALE_PREFIXES = ('# NOTE:', '# WHY:', '# HACK:', '# IMPORTANT:', '# TODO:', '# FIXME:')

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()

def _make_id() -> str:
    return str(uuid.uuid4())

# ── Per-language extractors ───────────────────────────────────────────────────
def _extract_from_tree(tree, source: bytes, file_path: str, repo_id: str) -> tuple[list[dict], list[dict]]:
    """Walk the AST and extract nodes + edges. Language-agnostic entry point."""
    nodes: list[dict] = []
    edges: list[dict] = []
    ext = Path(file_path).suffix.lower()

    if ext in ('.py',):
        _extract_python(tree.root_node, source, file_path, repo_id, nodes, edges)
    elif ext in ('.ts', '.tsx'):
        _extract_typescript(tree.root_node, source, file_path, repo_id, nodes, edges)
    elif ext in ('.js', '.jsx'):
        _extract_javascript(tree.root_node, source, file_path, repo_id, nodes, edges)
    elif ext in ('.go',):
        _extract_go(tree.root_node, source, file_path, repo_id, nodes, edges)
    elif ext in ('.rs',):
        _extract_rust(tree.root_node, source, file_path, repo_id, nodes, edges)
    elif ext in ('.java',):
        _extract_java(tree.root_node, source, file_path, repo_id, nodes, edges)
    else:
        # Fallback: generic function/class extraction
        _extract_generic(tree.root_node, source, file_path, repo_id, nodes, edges)

    return nodes, edges


def _make_node(repo_id: str, label: str, node_type: str, content: str,
               file_path: str, line: int, tags: list[str]) -> dict:
    return {
        'id':          _make_id(),
        'repoId':      repo_id,
        'type':        node_type,
        'label':       label,
        'content':     content,
        'tags':        tags,
        'confidence':  'EXTRACTED',
        'sourceFile':  file_path,
        'sourceLine':  line,
        'updatedAt':   _now(),
    }

def _make_edge(repo_id: str, source_id: str, target_label: str,
               edge_type: str, file_path: str) -> dict:
    return {
        'id':          _make_id(),
        'repoId':      repo_id,
        'sourceId':    source_id,
        'targetLabel': target_label,  # resolved to targetId in graph_builder
        'type':        edge_type,
        'confidence':  'EXTRACTED',
        'weight':      1.0,
        'createdAt':   _now(),
    }


def _extract_python(root: Node, source: bytes, fp: str, repo_id: str,
                    nodes: list, edges: list):
    def walk(node: Node, class_ctx: Optional[str] = None):
        if node.type == 'class_definition':
            name_node = node.child_by_field_name('name')
            if name_node:
                name = source[name_node.start_byte:name_node.end_byte].decode()
                # Extract docstring
                docstring = _extract_python_docstring(node, source)
                n = _make_node(repo_id, name, 'class',
                               docstring or f'Python class {name}', fp,
                               node.start_point[0] + 1, ['python', 'class'])
                nodes.append(n)
                # Superclasses → depends_on edges
                args = node.child_by_field_name('superclasses')
                if args:
                    for arg in args.named_children:
                        base = source[arg.start_byte:arg.end_byte].decode().strip()
                        if base:
                            edges.append(_make_edge(repo_id, n['id'], base, 'depends_on', fp))
                for child in node.children:
                    walk(child, class_ctx=name)

        elif node.type == 'function_definition':
            name_node = node.child_by_field_name('name')
            if name_node:
                name = source[name_node.start_byte:name_node.end_byte].decode()
                qualified = f'{class_ctx}.{name}' if class_ctx else name
                docstring = _extract_python_docstring(node, source)
                n = _make_node(repo_id, qualified, 'function',
                               docstring or f'Python function {qualified}', fp,
                               node.start_point[0] + 1, ['python', 'function'])
                nodes.append(n)
                # Call edges
                _find_calls_python(node, source, repo_id, n['id'], fp, edges)

        elif node.type == 'import_statement' or node.type == 'import_from_statement':
            _extract_python_import(node, source, repo_id, fp, nodes, edges)

        elif node.type == 'comment':
            text = source[node.start_byte:node.end_byte].decode().strip()
            if any(text.startswith(p) for p in RATIONALE_PREFIXES):
                n = _make_node(repo_id, text[:50], 'rationale', text, fp,
                               node.start_point[0] + 1, ['rationale', 'comment'])
                nodes.append(n)

        else:
            for child in node.children:
                walk(child, class_ctx)

    walk(root)


def _extract_python_docstring(func_node: Node, source: bytes) -> str:
    body = func_node.child_by_field_name('body')
    if not body:
        return ''
    for child in body.children:
        if child.type == 'expression_statement':
            expr = child.children[0] if child.children else None
            if expr and expr.type in ('string', 'concatenated_string'):
                raw = source[expr.start_byte:expr.end_byte].decode()
                return raw.strip('"""\'').strip()[:300]
    return ''


def _find_calls_python(func_node: Node, source: bytes, repo_id: str,
                        caller_id: str, fp: str, edges: list):
    def walk(node: Node):
        if node.type == 'call':
            fn = node.child_by_field_name('function')
            if fn:
                name = source[fn.start_byte:fn.end_byte].decode().strip()
                # Simple name (no dots) or attribute access
                if '.' in name:
                    name = name.split('.')[-1]
                if name and name.isidentifier():
                    edges.append(_make_edge(repo_id, caller_id, name, 'calls', fp))
        for child in node.children:
            walk(child)
    walk(func_node)


def _extract_python_import(node: Node, source: bytes, repo_id: str,
                            fp: str, nodes: list, edges: list):
    raw = source[node.start_byte:node.end_byte].decode().strip()
    # Build a simple import node
    n = _make_node(repo_id, raw[:80], 'import', raw, fp,
                   node.start_point[0] + 1, ['python', 'import'])
    nodes.append(n)


def _extract_typescript(root: Node, source: bytes, fp: str, repo_id: str,
                         nodes: list, edges: list):
    def walk(node: Node):
        # Classes
        if node.type in ('class_declaration', 'abstract_class_declaration'):
            name_node = node.child_by_field_name('name')
            if name_node:
                name = source[name_node.start_byte:name_node.end_byte].decode()
                n = _make_node(repo_id, name, 'class',
                               f'TypeScript class {name}', fp,
                               node.start_point[0] + 1, ['typescript', 'class'])
                nodes.append(n)
                # Implements clause
                for child in node.children:
                    if child.type == 'implements_clause':
                        for impl in child.named_children:
                            target = source[impl.start_byte:impl.end_byte].decode().strip()
                            edges.append(_make_edge(repo_id, n['id'], target, 'implements', fp))
                for child in node.children:
                    walk(child)

        # Interfaces
        elif node.type == 'interface_declaration':
            name_node = node.child_by_field_name('name')
            if name_node:
                name = source[name_node.start_byte:name_node.end_byte].decode()
                n = _make_node(repo_id, name, 'interface',
                               f'TypeScript interface {name}', fp,
                               node.start_point[0] + 1, ['typescript', 'interface'])
                nodes.append(n)

        # Functions and methods
        elif node.type in ('function_declaration', 'method_definition',
                           'arrow_function', 'function_expression'):
            name_node = node.child_by_field_name('name')
            if name_node:
                name = source[name_node.start_byte:name_node.end_byte].decode()
                jsDoc = _extract_jsdoc(node, source)
                n = _make_node(repo_id, name, 'function',
                               jsDoc or f'TypeScript function {name}', fp,
                               node.start_point[0] + 1, ['typescript', 'function'])
                nodes.append(n)

        # Imports
        elif node.type == 'import_statement':
            raw = source[node.start_byte:node.end_byte].decode().strip()
            n = _make_node(repo_id, raw[:80], 'import', raw, fp,
                           node.start_point[0] + 1, ['typescript', 'import'])
            nodes.append(n)

        for child in node.children:
            walk(child)

    walk(root)


def _extract_jsdoc(node: Node, source: bytes) -> str:
    """Look for a JSDoc comment immediately preceding this node."""
    # Tree-sitter puts comments as siblings before the node
    # Walk back through prev_sibling
    prev = node.prev_sibling
    while prev and prev.type in ('comment', '\n', ' '):
        if prev.type == 'comment':
            raw = source[prev.start_byte:prev.end_byte].decode().strip()
            if raw.startswith('/**') or raw.startswith('//'):
                return raw.lstrip('/*').rstrip('*/').strip()[:300]
        prev = prev.prev_sibling
    return ''


def _extract_javascript(root: Node, source: bytes, fp: str, repo_id: str,
                         nodes: list, edges: list):
    # JavaScript uses same grammar as TypeScript for most constructs
    _extract_typescript(root, source, fp, repo_id, nodes, edges)


def _extract_go(root: Node, source: bytes, fp: str, repo_id: str,
                nodes: list, edges: list):
    def walk(node: Node):
        if node.type == 'function_declaration':
            name_node = node.child_by_field_name('name')
            if name_node:
                name = source[name_node.start_byte:name_node.end_byte].decode()
                n = _make_node(repo_id, name, 'function',
                               f'Go function {name}', fp,
                               node.start_point[0] + 1, ['go', 'function'])
                nodes.append(n)
        elif node.type == 'type_declaration':
            name_node = node.child_by_field_name('name')
            if name_node:
                name = source[name_node.start_byte:name_node.end_byte].decode()
                n = _make_node(repo_id, name, 'class',
                               f'Go type {name}', fp,
                               node.start_point[0] + 1, ['go', 'type'])
                nodes.append(n)
        for child in node.children:
            walk(child)
    walk(root)


def _extract_rust(root: Node, source: bytes, fp: str, repo_id: str,
                  nodes: list, edges: list):
    def walk(node: Node):
        if node.type in ('function_item', 'fn_item'):
            name_node = node.child_by_field_name('name')
            if name_node:
                name = source[name_node.start_byte:name_node.end_byte].decode()
                n = _make_node(repo_id, name, 'function',
                               f'Rust fn {name}', fp,
                               node.start_point[0] + 1, ['rust', 'function'])
                nodes.append(n)
        elif node.type in ('struct_item', 'enum_item', 'trait_item', 'impl_item'):
            name_node = node.child_by_field_name('name')
            if name_node:
                name = source[name_node.start_byte:name_node.end_byte].decode()
                n = _make_node(repo_id, name, 'class',
                               f'Rust {node.type} {name}', fp,
                               node.start_point[0] + 1, ['rust', node.type])
                nodes.append(n)
        for child in node.children:
            walk(child)
    walk(root)


def _extract_java(root: Node, source: bytes, fp: str, repo_id: str,
                  nodes: list, edges: list):
    def walk(node: Node):
        if node.type == 'class_declaration':
            name_node = node.child_by_field_name('name')
            if name_node:
                name = source[name_node.start_byte:name_node.end_byte].decode()
                n = _make_node(repo_id, name, 'class',
                               f'Java class {name}', fp,
                               node.start_point[0] + 1, ['java', 'class'])
                nodes.append(n)
        elif node.type == 'method_declaration':
            name_node = node.child_by_field_name('name')
            if name_node:
                name = source[name_node.start_byte:name_node.end_byte].decode()
                n = _make_node(repo_id, name, 'function',
                               f'Java method {name}', fp,
                               node.start_point[0] + 1, ['java', 'method'])
                nodes.append(n)
        for child in node.children:
            walk(child)
    walk(root)


def _extract_generic(root: Node, source: bytes, fp: str, repo_id: str,
                     nodes: list, edges: list):
    """Fallback: extract anything named 'function' or 'class' in the AST."""
    def walk(node: Node):
        if 'function' in node.type or 'class' in node.type:
            name_node = node.child_by_field_name('name')
            if name_node:
                name = source[name_node.start_byte:name_node.end_byte].decode()
                t = 'function' if 'function' in node.type else 'class'
                n = _make_node(repo_id, name, t, f'{t} {name}', fp,
                               node.start_point[0] + 1, [t])
                nodes.append(n)
        for child in node.children:
            walk(child)
    walk(root)


# ── Public API ────────────────────────────────────────────────────────────────
def extract_repo(repo_path: str, repo_id: str,
                 ignored_paths: set[str] | None = None) -> tuple[list[dict], list[dict]]:
    """
    Walk repo_path, run Tree-sitter on every supported file.
    Returns (nodes, edges) — all with confidence='EXTRACTED'.
    Skips paths in ignored_paths set.
    """
    all_nodes: list[dict] = []
    all_edges: list[dict] = []
    ignored_paths = ignored_paths or set()

    for root_dir, dirs, files in os.walk(repo_path):
        # Prune ignored directories in-place
        dirs[:] = [d for d in dirs if d not in DEFAULT_IGNORE
                   and os.path.join(root_dir, d) not in ignored_paths]

        for fname in files:
            abs_path = os.path.join(root_dir, fname)
            rel_path = os.path.relpath(abs_path, repo_path)

            if rel_path in ignored_paths:
                continue

            ext = Path(fname).suffix.lower()
            if ext not in LANG_MAP:
                continue

            try:
                with open(abs_path, 'rb') as f:
                    source = f.read()

                parser = Parser(LANG_MAP[ext])
                tree = parser.parse(source)
                file_nodes, file_edges = _extract_from_tree(tree, source, rel_path, repo_id)
                all_nodes.extend(file_nodes)
                all_edges.extend(file_edges)
            except Exception as e:
                # Never crash on a bad file — just skip it
                print(f'[AST] Skipping {rel_path}: {e}')

    return all_nodes, all_edges
```

### 3e. `graph-service/core/graph_builder.py`

```python
"""
Build a NetworkX DiGraph from extracted nodes and edges.
Resolves edge targetLabel → targetId using label lookup.
"""
import networkx as nx
from typing import Optional


def build_graph(nodes: list[dict], edges: list[dict]) -> nx.DiGraph:
    """
    Build a directed NetworkX graph from node/edge dicts.
    Unresolved edges (targetLabel not in graph) are stored as attributes
    for debugging — they do not cause exceptions.
    """
    G = nx.DiGraph()

    # Build label → id lookup (last-write wins for duplicate labels)
    label_to_id: dict[str, str] = {}
    for n in nodes:
        G.add_node(n['id'], **n)
        label_to_id[n['label']] = n['id']

    # Add edges — resolve targetLabel to targetId
    unresolved = 0
    for e in edges:
        source_id = e['sourceId']
        target_id = label_to_id.get(e.get('targetLabel', ''))
        if target_id and G.has_node(source_id) and G.has_node(target_id):
            G.add_edge(source_id, target_id,
                       type=e['type'],
                       confidence=e['confidence'],
                       weight=e['weight'])
        else:
            unresolved += 1

    if unresolved:
        print(f'[GraphBuilder] {unresolved} edges unresolved (external symbols — expected)')

    return G


def get_god_nodes(G: nx.DiGraph, community_nodes: list[str], top_n: int = 3) -> list[str]:
    """Return the top_n highest-degree nodes within a subgraph."""
    sub = G.subgraph(community_nodes)
    return sorted(community_nodes, key=lambda n: sub.degree(n), reverse=True)[:top_n]


def get_node_neighbors(G: nx.DiGraph, node_id: str, hops: int = 2) -> set[str]:
    """BFS expansion from a node, up to `hops` levels deep."""
    visited = {node_id}
    frontier = {node_id}
    for _ in range(hops):
        next_frontier = set()
        for n in frontier:
            next_frontier.update(G.predecessors(n))
            next_frontier.update(G.successors(n))
        frontier = next_frontier - visited
        visited.update(frontier)
    return visited


def shortest_path(G: nx.DiGraph, source_label: str, target_label: str,
                  nodes: list[dict]) -> Optional[list[str]]:
    """Find shortest path between two nodes by label."""
    label_to_id = {n['label']: n['id'] for n in nodes}
    src_id = label_to_id.get(source_label)
    tgt_id = label_to_id.get(target_label)
    if not src_id or not tgt_id:
        return None
    try:
        path = nx.shortest_path(G.to_undirected(), src_id, tgt_id)
        return [G.nodes[n].get('label', n) for n in path]
    except nx.NetworkXNoPath:
        return None
```

### 3f. `graph-service/core/leiden_clusterer.py`

```python
"""
Leiden community detection via graspologic.
Runs on NetworkX graph — NO embeddings, NO vector store.
Groups nodes by edge density: who calls whom, who imports whom.
"""
import uuid
from datetime import datetime, timezone

import networkx as nx
from graspologic.partition import leiden

from .graph_builder import get_god_nodes


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def cluster(G: nx.DiGraph, repo_id: str, trials: int = 10) -> list[dict]:
    """
    Run Leiden on the graph. Returns a list of Community dicts.
    Multiple trials → take best modularity partition.
    """
    if G.number_of_nodes() == 0:
        return []

    # Leiden needs undirected + weighted
    G_und = G.to_undirected()
    nx.set_edge_attributes(G_und, 1, 'weight')

    # Get the largest connected component (Leiden needs connected graph)
    components = list(nx.connected_components(G_und))
    if not components:
        return []

    all_communities: list[dict] = []

    for component in components:
        if len(component) < 2:
            # Single-node component → its own community
            node_id = list(component)[0]
            label = G.nodes[node_id].get('label', node_id)
            all_communities.append({
                'id':        str(uuid.uuid4()),
                'repoId':    repo_id,
                'label':     label,
                'nodeIds':   [node_id],
                'godNodeId': node_id,
                'updatedAt': _now(),
            })
            continue

        subgraph = G_und.subgraph(component).copy()

        try:
            community_map = leiden(subgraph, trials=trials, random_seed=42)
        except Exception as e:
            print(f'[Leiden] Error on component of size {len(component)}: {e}')
            continue

        # Group nodes by community id
        buckets: dict[int, list[str]] = {}
        for node_id, comm_id in community_map.items():
            buckets.setdefault(comm_id, []).append(node_id)

        for comm_id, node_ids in buckets.items():
            god_nodes = get_god_nodes(G, node_ids, top_n=1)
            god_node_id = god_nodes[0] if god_nodes else node_ids[0]
            god_label   = G.nodes[god_node_id].get('label', god_node_id)

            # Auto-label: "God_Label Community"
            label = f'{god_label} Community'

            all_communities.append({
                'id':        str(uuid.uuid4()),
                'repoId':    repo_id,
                'label':     label,
                'nodeIds':   node_ids,
                'godNodeId': god_node_id,
                'updatedAt': _now(),
            })

    return all_communities


def get_surprising_edges(G: nx.DiGraph, communities: list[dict]) -> list[dict]:
    """
    Find high-value cross-community edges (architectural surprises).
    Scores: cross-community edge > within-community edge.
    Returns top 10 ranked by cross-community surprise score.
    """
    node_to_community = {}
    for c in communities:
        for nid in c['nodeIds']:
            node_to_community[nid] = c['id']

    cross_edges = []
    for src, tgt, data in G.edges(data=True):
        src_comm = node_to_community.get(src)
        tgt_comm = node_to_community.get(tgt)
        if src_comm and tgt_comm and src_comm != tgt_comm:
            cross_edges.append({
                'source':      G.nodes[src].get('label', src),
                'target':      G.nodes[tgt].get('label', tgt),
                'type':        data.get('type', 'unknown'),
                'confidence':  data.get('confidence', 'INFERRED'),
                'src_community': src_comm,
                'tgt_community': tgt_comm,
            })

    return cross_edges[:10]
```

### 3g. `graph-service/core/query_engine.py`

```python
"""
Graph query engine: BFS, DFS, and KNN-seeded expansion.
Used by the CLI graphchat query command (Priority 3) and the API.
"""
import networkx as nx
from .graph_builder import get_node_neighbors


def query_bfs(G: nx.DiGraph, seed_node_ids: list[str],
              hops: int = 2, budget_chars: int = 8000) -> dict:
    """BFS expansion from seed nodes. Good for 'what connects X to Y?'"""
    visited = set()
    for seed in seed_node_ids:
        if G.has_node(seed):
            visited.update(get_node_neighbors(G, seed, hops))

    return _build_result(G, visited, budget_chars, mode='bfs')


def query_dfs(G: nx.DiGraph, seed_node_ids: list[str],
              hops: int = 3, budget_chars: int = 8000) -> dict:
    """DFS traversal — good for tracing a specific call chain."""
    visited = set()
    stack = list(seed_node_ids)
    depth = 0
    while stack and depth < hops:
        node_id = stack.pop()
        if node_id not in visited and G.has_node(node_id):
            visited.add(node_id)
            stack.extend(list(G.successors(node_id)))
        depth += 1

    return _build_result(G, visited, budget_chars, mode='dfs')


def query_knn_expand(G: nx.DiGraph, seed_node_ids: list[str],
                     hops: int = 2, budget_chars: int = 8000) -> dict:
    """
    KNN-seeded expansion: start from vector search results (seeds),
    expand via call/import edges. Best of both worlds.
    """
    visited = set(seed_node_ids)
    for seed in seed_node_ids:
        if G.has_node(seed):
            # Expand: follow EXTRACTED edges preferentially
            for neighbor in list(G.predecessors(seed)) + list(G.successors(seed)):
                edge_data = G.get_edge_data(seed, neighbor) or G.get_edge_data(neighbor, seed) or {}
                if edge_data.get('confidence') == 'EXTRACTED':
                    visited.update(get_node_neighbors(G, neighbor, max(0, hops - 1)))
                else:
                    visited.add(neighbor)

    return _build_result(G, visited, budget_chars, mode='knn')


def _build_result(G: nx.DiGraph, node_ids: set[str],
                  budget_chars: int, mode: str) -> dict:
    nodes = []
    edges = []
    char_count = 0

    # Sort by degree descending (god nodes first)
    sorted_ids = sorted(node_ids, key=lambda n: G.degree(n) if G.has_node(n) else 0, reverse=True)

    for nid in sorted_ids:
        if not G.has_node(nid):
            continue
        node_data = dict(G.nodes[nid])
        content = node_data.get('content', '')
        char_count += len(content) + len(node_data.get('label', ''))
        if char_count > budget_chars:
            break
        node_data.pop('embedding', None)  # never include embeddings in output
        nodes.append(node_data)

    included_ids = {n['id'] for n in nodes}
    for src, tgt, data in G.edges(data=True):
        if src in included_ids and tgt in included_ids:
            edges.append({
                'source': G.nodes[src].get('label', src),
                'target': G.nodes[tgt].get('label', tgt),
                **data
            })

    token_estimate = char_count // 4  # rough 4 chars/token estimate

    return {
        'nodes':          nodes,
        'edges':          edges,
        'token_estimate': token_estimate,
        'mode_used':      mode,
    }
```

### 3h. `graph-service/core/report_generator.py`

```python
"""
Generate GRAPH_REPORT.md — a compressed, token-efficient context document
that AI agents can fetch once and use for all subsequent queries.
This is the core token-minimization artifact.
"""
from datetime import datetime


def generate_report(nodes: list[dict], edges: list[dict],
                    communities: list[dict], repo_name: str) -> str:
    extracted = [n for n in nodes if n.get('confidence') == 'EXTRACTED']
    inferred  = [n for n in nodes if n.get('confidence') == 'INFERRED']

    god_node_ids = {c['godNodeId'] for c in communities}
    god_nodes    = [n for n in nodes if n['id'] in god_node_ids]

    lines = [
        f'# GRAPH_REPORT — {repo_name}',
        f'Generated: {datetime.utcnow().isoformat()}Z',
        f'Nodes: {len(nodes)} ({len(extracted)} EXTRACTED, {len(inferred)} INFERRED)',
        f'Edges: {len(edges)}',
        f'Communities: {len(communities)}',
        '',
        '## God Nodes (Highest Connectivity)',
        '> These are the architectural hub concepts. Start here.',
        '',
    ]

    for gn in god_nodes[:10]:
        lines.append(f'### {gn["label"]} ({gn["type"]})')
        lines.append(f'{gn["content"][:200]}')
        if gn.get("sourceFile"):
            lines.append(f'*Source: `{gn["sourceFile"]}`:{gn.get("sourceLine","")}*')
        lines.append('')

    lines += [
        '## Communities',
        '',
    ]

    for c in communities:
        lines.append(f'### {c["label"]}')
        lines.append(f'Nodes: {len(c["nodeIds"])}')
        # Show first 5 node labels
        member_labels = []
        node_map = {n["id"]: n for n in nodes}
        for nid in c['nodeIds'][:5]:
            n = node_map.get(nid)
            if n:
                member_labels.append(f'`{n["label"]}`')
        if member_labels:
            lines.append(f'Members: {", ".join(member_labels)}{"..." if len(c["nodeIds"]) > 5 else ""}')
        lines.append('')

    lines += [
        '## Agent Instructions',
        '1. Use this report to understand the codebase structure at a glance.',
        '2. Call the `/api/search` endpoint for semantic queries.',
        '3. Call `/api/graph/community/{id}` to get all nodes in a community.',
        '4. Never read raw files — query the graph instead.',
        f'5. Token cost of this report: ~{len(" ".join(lines)) // 4} tokens vs'
        f' ~{len(nodes) * 800} tokens to read all raw files.',
    ]

    return '\n'.join(lines)
```

### 3i. `graph-service/main.py`

```python
"""
GRAPHCHAT Graph Service — FastAPI application.
Port 5000. Internal only (not exposed via Nginx).
Called by NestJS GraphBridgeService.
"""
import time
import os
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
import redis as redis_client
from dotenv import load_dotenv

from models.schemas import (
    AnalyzeRequest, AnalyzeResponse,
    ClusterRequest, ClusterResponse,
    QueryRequest, QueryResponse,
)
from core.ast_extractor  import extract_repo
from core.graph_builder  import build_graph, shortest_path
from core.leiden_clusterer import cluster, get_surprising_edges
from core.query_engine   import query_bfs, query_dfs, query_knn_expand
from core.report_generator import generate_report

load_dotenv()

# ── DB clients ────────────────────────────────────────────────────────────────
MONGO_URI = os.getenv('MONGODB_URI', 'mongodb://root:secret@mongo:27017/vectorgraph?authSource=admin')
REDIS_URL  = os.getenv('REDIS_URL', 'redis://redis:6379')

mongo = MongoClient(MONGO_URI)
db    = mongo['vectorgraph']
nodes_col  = db['context_nodes']
repos_col  = db['repositories']
edges_col  = db['context_edges']  # NEW collection
communities_col = db['communities']  # NEW collection

r = redis_client.from_url(REDIS_URL, decode_responses=True)

# ── In-memory graph cache (repo_id → NetworkX DiGraph) ────────────────────────
# Rebuilt on each /analyze call. Survives container restarts via MongoDB.
_graph_cache: dict[str, object] = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    print('[graph-service] Starting up...')
    yield
    print('[graph-service] Shutting down...')

app = FastAPI(title='GRAPHCHAT Graph Service', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])


# ── Health ─────────────────────────────────────────────────────────────────────
@app.get('/health')
def health():
    return {'status': 'ok', 'service': 'graph-service'}


# ── POST /analyze ─────────────────────────────────────────────────────────────
@app.post('/analyze', response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    """
    Full pipeline: Tree-sitter AST → NetworkX → Leiden → persist to MongoDB.
    NestJS calls this when a repo is first indexed or force-refreshed.
    """
    start = time.time()

    if not os.path.exists(req.repo_path):
        raise HTTPException(status_code=400, detail=f'Path not found: {req.repo_path}')

    # 1. AST extraction (zero LLM, zero network)
    nodes, edges = extract_repo(req.repo_path, req.repo_id)

    # 2. Build NetworkX graph
    G = build_graph(nodes, edges)
    _graph_cache[req.repo_id] = G

    # 3. Leiden clustering
    communities = cluster(G, req.repo_id, trials=10)
    surprising  = get_surprising_edges(G, communities)

    # 4. Persist to MongoDB (upsert by id)
    if nodes:
        ops = [{'updateOne': {'filter': {'id': n['id']}, 'update': {'$set': n}, 'upsert': True}}
               for n in nodes]
        nodes_col.bulk_write(ops)

    if edges:
        resolved_edges = [e for e in edges if 'targetId' in e]  # skip unresolved
        if resolved_edges:
            ops = [{'updateOne': {'filter': {'id': e['id']}, 'update': {'$set': e}, 'upsert': True}}
                   for e in resolved_edges]
            edges_col.bulk_write(ops)

    if communities:
        ops = [{'updateOne': {'filter': {'id': c['id']}, 'update': {'$set': c}, 'upsert': True}}
               for c in communities]
        communities_col.bulk_write(ops)

    # 5. Generate + cache GRAPH_REPORT in Redis
    repo = repos_col.find_one({'id': req.repo_id})
    repo_name = repo.get('name', req.repo_id) if repo else req.repo_id
    report_md = generate_report(nodes, edges, communities, repo_name)
    r.setex(f'repo:{req.repo_id}:graph_report', 60 * 60 * 24, report_md)

    # 6. Cache community prompts in Redis
    node_map = {n['id']: n for n in nodes}
    for c in communities:
        c_nodes = [node_map[nid] for nid in c['nodeIds'] if nid in node_map]
        god_node = node_map.get(c['godNodeId'])
        god_label = god_node['label'] if god_node else ''
        prompt = _build_community_prompt(c, c_nodes, god_label)
        r.setex(f'community:{c["id"]}:prompt', 60 * 60 * 24, prompt)
        r.setex(f'community:{c["id"]}:meta', 60 * 60 * 24,
                f'{{"id":"{c["id"]}","repoId":"{req.repo_id}","label":"{c["label"]}","nodeCount":{len(c["nodeIds"])}}}')

    duration_ms = int((time.time() - start) * 1000)
    god_node_labels = []
    for c in communities:
        n = node_map.get(c['godNodeId'])
        if n:
            god_node_labels.append(n['label'])

    return AnalyzeResponse(
        repo_id=req.repo_id,
        nodes_added=len(nodes),
        edges_added=len(edges),
        communities=len(communities),
        god_nodes=god_node_labels[:5],
        duration_ms=duration_ms,
    )


# ── POST /cluster ──────────────────────────────────────────────────────────────
@app.post('/cluster', response_model=ClusterResponse)
def cluster_repo(req: ClusterRequest):
    """Re-cluster an existing graph (e.g. after new nodes added via UI)."""
    start = time.time()

    # Load nodes from MongoDB
    nodes = list(nodes_col.find({'repoId': req.repo_id}, {'_id': 0}))
    edges = list(edges_col.find({'repoId': req.repo_id}, {'_id': 0}))

    if not nodes:
        raise HTTPException(status_code=404, detail='No nodes found for this repo. Run /analyze first.')

    G = build_graph(nodes, edges)
    _graph_cache[req.repo_id] = G
    communities = cluster(G, req.repo_id, trials=10)

    duration_ms = int((time.time() - start) * 1000)
    return ClusterResponse(repo_id=req.repo_id, communities=communities, duration_ms=duration_ms)


# ── POST /query ────────────────────────────────────────────────────────────────
@app.post('/query', response_model=QueryResponse)
def query_graph(req: QueryRequest):
    """
    Graph traversal query starting from vector search seed nodes.
    NestJS: first runs vector search → passes result node IDs here → we expand via graph.
    """
    G = _graph_cache.get(req.repo_id)
    if G is None:
        # Rebuild from MongoDB
        nodes = list(nodes_col.find({'repoId': req.repo_id}, {'_id': 0}))
        edges = list(edges_col.find({'repoId': req.repo_id}, {'_id': 0}))
        if not nodes:
            raise HTTPException(status_code=404, detail='Run /analyze first.')
        G = build_graph(nodes, edges)
        _graph_cache[req.repo_id] = G

    budget_chars = (req.budget or 2000) * 4

    if req.mode == 'bfs':
        result = query_bfs(G, req.seed_node_ids, req.hops, budget_chars)
    elif req.mode == 'dfs':
        result = query_dfs(G, req.seed_node_ids, req.hops, budget_chars)
    else:  # knn (default)
        result = query_knn_expand(G, req.seed_node_ids, req.hops, budget_chars)

    return QueryResponse(**result)


# ── GET /report/{repo_id} ──────────────────────────────────────────────────────
@app.get('/report/{repo_id}')
def get_report(repo_id: str):
    cached = r.get(f'repo:{repo_id}:graph_report')
    if cached:
        return {'report': cached, 'source': 'cache'}
    # Rebuild
    nodes = list(nodes_col.find({'repoId': repo_id}, {'_id': 0}))
    edges = list(edges_col.find({'repoId': repo_id}, {'_id': 0}))
    communities = list(communities_col.find({'repoId': repo_id}, {'_id': 0}))
    repo = repos_col.find_one({'id': repo_id})
    if not nodes:
        raise HTTPException(status_code=404, detail='No graph data found.')
    report = generate_report(nodes, edges, communities, repo.get('name', repo_id) if repo else repo_id)
    r.setex(f'repo:{repo_id}:graph_report', 60 * 60 * 24, report)
    return {'report': report, 'source': 'rebuilt'}


# ── GET /path ─────────────────────────────────────────────────────────────────
@app.get('/path')
def get_path(repo_id: str, source: str, target: str):
    """Shortest path between two node labels."""
    G = _graph_cache.get(repo_id)
    if G is None:
        nodes = list(nodes_col.find({'repoId': repo_id}, {'_id': 0}))
        edges = list(edges_col.find({'repoId': repo_id}, {'_id': 0}))
        G = build_graph(nodes, edges)
        _graph_cache[repo_id] = G
    nodes_list = [dict(G.nodes[n]) for n in G.nodes]
    path = shortest_path(G, source, target, nodes_list)
    if not path:
        raise HTTPException(status_code=404, detail=f'No path from {source} to {target}')
    return {'path': path, 'hops': len(path) - 1}


def _build_community_prompt(community: dict, nodes: list[dict], god_label: str) -> str:
    extracted = [n for n in nodes if n.get('confidence') == 'EXTRACTED']
    return '\n'.join([
        f'## {community["label"]}',
        f'God node: {god_label}',
        f'Size: {len(nodes)} nodes ({len(extracted)} AST-extracted)',
        '',
        *[f'- [{n["type"]}] {n["label"]}: {n["content"][:100]}'
          for n in extracted[:8]],
    ])
```

### 3j. `docker/graph-service.Dockerfile`

```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY graph-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim AS runner
WORKDIR /app

# Copy installed packages
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy app code
COPY graph-service/ .

EXPOSE 5000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000", "--workers", "2"]
```

---

## 4. NestJS → Graph Service Bridge

### 4a. `apps/api/src/app/graph/graph-bridge.service.ts`

```typescript
/**
 * HTTP bridge from NestJS to the Python graph-service.
 * All methods are fire-and-forget or return typed results.
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { AnalyzeRepoDto, AnalyzeRepoResult, GraphQueryDto } from '@vectorgraph/shared-types';

@Injectable()
export class GraphBridgeService {
  private client: AxiosInstance;

  constructor(private cfg: ConfigService) {
    this.client = axios.create({
      baseURL: cfg.get('GRAPH_SERVICE_URL', 'http://graph-service:5000'),
      timeout: 120_000, // 2 min — large repos take time
    });
  }

  /** Trigger full AST + cluster pipeline for a repo */
  async analyzeRepo(dto: AnalyzeRepoDto): Promise<AnalyzeRepoResult> {
    const { data } = await this.client.post('/analyze', {
      repo_id:   dto.repoId,
      repo_path: dto.repoPath,
      languages: dto.languages ?? [],
    });
    return {
      repoId:      data.repo_id,
      nodesAdded:  data.nodes_added,
      edgesAdded:  data.edges_added,
      communities: data.communities,
      godNodes:    data.god_nodes,
      durationMs:  data.duration_ms,
    };
  }

  /** Re-cluster existing nodes (after UI adds new nodes) */
  async recluster(repoId: string): Promise<void> {
    await this.client.post('/cluster', { repo_id: repoId });
  }

  /** Graph-expanded query (call after vector search gives seed IDs) */
  async query(dto: GraphQueryDto & { seedNodeIds: string[] }) {
    const { data } = await this.client.post('/query', {
      repo_id:       dto.repoId,
      query:         dto.query,
      mode:          dto.mode ?? 'knn',
      budget:        dto.budget ?? 2000,
      hops:          dto.hops ?? 2,
      seed_node_ids: dto.seedNodeIds,
    });
    return data;
  }

  /** Get pre-built GRAPH_REPORT.md for a repo */
  async getReport(repoId: string): Promise<string> {
    const { data } = await this.client.get(`/report/${repoId}`);
    return data.report;
  }

  /** Shortest path between two node labels */
  async getPath(repoId: string, source: string, target: string) {
    const { data } = await this.client.get('/path', {
      params: { repo_id: repoId, source, target },
    });
    return data;
  }

  /** Health check */
  async isHealthy(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch {
      return false;
    }
  }
}
```

### 4b. `apps/api/src/app/graph/graph.controller.ts`

```typescript
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { GraphBridgeService }    from './graph-bridge.service';
import { CommunityCacheService } from './community-cache.service';

@Controller('graph')
export class GraphController {
  constructor(
    private bridge: GraphBridgeService,
    private cache:  CommunityCacheService,
  ) {}

  /** Trigger AST analysis for a repo (called after repo creation or manual refresh) */
  @Post('analyze')
  analyze(@Body() body: { repoId: string; repoPath: string }) {
    return this.bridge.analyzeRepo({ repoId: body.repoId, repoPath: body.repoPath });
  }

  /** Re-cluster after UI adds new nodes */
  @Post('cluster/:repoId')
  recluster(@Param('repoId') repoId: string) {
    return this.bridge.recluster(repoId);
  }

  /** Get GRAPH_REPORT.md for a repo */
  @Get('report/:repoId')
  report(@Param('repoId') repoId: string) {
    return this.bridge.getReport(repoId);
  }

  /** Get all communities for a repo */
  @Get('communities/:repoId')
  communities(@Param('repoId') repoId: string) {
    return this.cache.getRepoCommunities(repoId);
  }

  /** Get pre-built community context prompt */
  @Get('community/:communityId/prompt')
  communityPrompt(@Param('communityId') communityId: string) {
    return this.cache.getCommunityPrompt(communityId);
  }

  /** Shortest path between two node labels */
  @Get('path')
  path(
    @Query('repoId') repoId: string,
    @Query('source') source: string,
    @Query('target') target: string,
  ) {
    return this.bridge.getPath(repoId, source, target);
  }

  /** Graph health check */
  @Get('health')
  health() {
    return this.bridge.isHealthy();
  }
}
```

### 4c. Update `apps/api/src/app/repos/repos.service.ts`

Add a call to graph-service after repo creation. In `create()`, add a fire-and-forget analyze call:

```typescript
// Add to constructor
constructor(
  private cfg: ConfigService,
  private graphBridge: GraphBridgeService,  // INJECT THIS
) { ... }

// Update create() — add graph analysis trigger at the end
async create(dto: CreateRepoDto): Promise<Repository> {
  const repo: Repository = {
    id: uuid(), nodes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...dto,
  };
  await this.mongo.saveRepo(repo);

  // Fire-and-forget: if repoPath provided in dto (optional field), trigger AST analysis
  // For repos without a local path, this is skipped — user can trigger manually via POST /graph/analyze
  const repoPath = (dto as any).repoPath;
  if (repoPath) {
    this.graphBridge.analyzeRepo({ repoId: repo.id, repoPath }).catch(err => {
      console.warn(`[ReposService] Graph analysis failed for ${repo.id}:`, err.message);
    });
  }

  return repo;
}
```

Add `GraphBridgeService` to `repos.module.ts` providers.

Also add `repoPath?: string` to `CreateRepoDto` in `shared-types/src/index.ts`:
```typescript
export interface CreateRepoDto {
  name:        string;
  description: string;
  techStack:   string[];
  agent:       AgentType;
  repoPath?:   string;  // NEW: absolute path on VPS — triggers AST analysis
}
```

---

## 5. Docker Compose Updates

### 5a. Update `docker-compose.yml` (local dev — add graph-service)

```yaml
version: '3.9'
services:
  redis:
    image: redis/redis-stack:latest
    ports: ["6379:6379", "8001:8001"]
    volumes: [redis_data:/data]

  mongo:
    image: mongo:7
    ports: ["27017:27017"]
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: secret
    volumes: [mongo_data:/data/db]

  graph-service:                               # NEW
    build:
      context: .
      dockerfile: docker/graph-service.Dockerfile
    ports: ["5000:5000"]
    environment:
      MONGODB_URI: mongodb://root:secret@mongo:27017/vectorgraph?authSource=admin
      REDIS_URL: redis://redis:6379
    volumes:
      - ./graph-service:/app    # hot-reload for dev
      - repo_data:/repos        # shared volume for repo files
    depends_on: [redis, mongo]
    command: uvicorn main:app --host 0.0.0.0 --port 5000 --reload

volumes:
  redis_data:
  mongo_data:
  repo_data:    # NEW: shared volume for repo files analyzed by graph-service
```

### 5b. Update `docker-compose.prod.yml` (add graph-service)

Add after the `web` service block:

```yaml
  graph-service:
    build:
      context: .
      dockerfile: docker/graph-service.Dockerfile
    env_file: .env.prod
    volumes:
      - repo_data:/repos
    depends_on: [redis, mongo]
    restart: always
```

Add `repo_data:` to the `volumes:` section at the bottom.

### 5c. Update `docker/nginx/nginx.conf`

Add graph-service upstream (internal only, not exposed externally):
```nginx
upstream graph { server graph-service:5000; }
```
> Note: Do NOT add a public route for graph-service. It stays internal. NestJS bridges it.

---

## 6. Environment Variables to Add

**Add to `.env` (local dev):**
```env
# Graph service
GRAPH_SERVICE_URL=http://localhost:5000
```

**Add to `.env.prod`:**
```env
# Graph service (internal Docker network)
GRAPH_SERVICE_URL=http://graph-service:5000
```

**Add to `.env.example`:**
```env
# Python graph sidecar — Tree-sitter + Leiden
GRAPH_SERVICE_URL=http://graph-service:5000
```

---

## 7. New MongoDB Collections

The graph-service creates two new MongoDB collections automatically. Ensure MongoDB indexes are created on startup:

**`apps/api/src/app/app.module.ts`** — add a `MongoIndexService` or add to an existing service's `onModuleInit`:

```typescript
// In MongoVectorService.connect(), add after existing createIndex calls:
await this.client.db('vectorgraph').collection('context_edges').createIndex({ repoId: 1 });
await this.client.db('vectorgraph').collection('context_edges').createIndex({ sourceId: 1 });
await this.client.db('vectorgraph').collection('context_edges').createIndex({ targetId: 1 });
await this.client.db('vectorgraph').collection('communities').createIndex({ repoId: 1 });
await this.client.db('vectorgraph').collection('communities').createIndex({ godNodeId: 1 });
```

---

## 8. Build Order — Follow Exactly

```
Step 1 — Update shared-types
  ✎ libs/shared-types/src/index.ts  (replace entire file)

Step 2 — Priority 1: Token minimization
  2a ✎ npm install ignore
  2b ✎ apps/api/src/app/shared/ignore.service.ts  (new)
  2c ✎ libs/vector-client/src/redis.service.ts  (update ensureIndex + search method)
       ⚠ Drop existing Redis index: await client.ft.dropIndex('idx:context') then restart
  2d ✎ apps/api/src/app/nodes/nodes.service.ts  (add confidence default)
  2e ✎ apps/api/src/app/search/search.controller.ts  (add budget, minConfidence params)
  2f ✎ apps/api/src/app/search/search.service.ts  (pass params through)
  2g ✎ apps/api/src/app/graph/community-cache.service.ts  (new)
  2h ✎ apps/api/src/app/graph/graph.module.ts  (new)
  2i ✎ apps/api/src/app/app.module.ts  (add GraphModule import)
  2j ✅ Verify: nx serve api starts, GET /api/search?q=test&budget=1000 returns results

Step 3 — Priority 2: Python graph sidecar
  3a ✎ graph-service/requirements.txt  (new)
  3b ✎ graph-service/models/__init__.py  (empty)
  3c ✎ graph-service/models/schemas.py  (new)
  3d ✎ graph-service/core/__init__.py  (empty)
  3e ✎ graph-service/core/ast_extractor.py  (new)
  3f ✎ graph-service/core/graph_builder.py  (new)
  3g ✎ graph-service/core/leiden_clusterer.py  (new)
  3h ✎ graph-service/core/query_engine.py  (new)
  3i ✎ graph-service/core/report_generator.py  (new)
  3j ✎ graph-service/main.py  (new)
  3k ✎ docker/graph-service.Dockerfile  (new)

Step 4 — NestJS bridge
  4a ✎ apps/api/src/app/graph/graph-bridge.service.ts  (new)
  4b ✎ apps/api/src/app/graph/graph.controller.ts  (new)
  4c ✎ apps/api/src/app/graph/graph.module.ts  (update: add GraphBridgeService + GraphController)
  4d ✎ apps/api/src/app/repos/repos.service.ts  (inject GraphBridgeService, fire-and-forget analyze)
  4e ✎ apps/api/src/app/repos/repos.module.ts  (import GraphModule)

Step 5 — Docker + env
  5a ✎ docker-compose.yml  (add graph-service + repo_data volume)
  5b ✎ docker-compose.prod.yml  (add graph-service + repo_data volume)
  5c ✎ .env  (add GRAPH_SERVICE_URL=http://localhost:5000)
  5d ✎ .env.prod  (add GRAPH_SERVICE_URL=http://graph-service:5000)
  5e ✎ .env.example  (add GRAPH_SERVICE_URL)

Step 6 — MongoDB indexes
  6a ✎ libs/vector-client/src/mongo.service.ts  (add edges + communities index creation)

Step 7 — Verify full stack
  docker-compose up -d
  nx serve api
  # Test 1: search with budget
  curl "http://localhost:3001/api/search?q=auth&budget=500&minConfidence=EXTRACTED"
  # Test 2: trigger graph analysis (use an actual path on your machine)
  curl -X POST http://localhost:3001/api/graph/analyze \
    -H "Content-Type: application/json" \
    -d '{"repoId":"test-repo-id","repoPath":"/absolute/path/to/your/repo"}'
  # Test 3: check graph-service directly
  curl http://localhost:5000/health
  # Test 4: get graph report
  curl http://localhost:3001/api/graph/report/test-repo-id
```

---

## 9. Definition of Done

- [ ] `nx serve api` starts with no errors. `GraphModule` is loaded.
- [ ] `GET /api/search?q=auth&budget=500` returns results filtered to budget
- [ ] `GET /api/search?q=auth&minConfidence=EXTRACTED` returns only AST-extracted nodes
- [ ] `POST /api/graph/analyze` triggers graph-service and returns `{ nodesAdded, edgesAdded, communities, godNodes }`
- [ ] `GET /api/graph/report/:repoId` returns a GRAPH_REPORT.md string
- [ ] `GET /api/graph/communities/:repoId` returns community list from Redis cache
- [ ] `GET /api/graph/community/:id/prompt` returns pre-compressed context string
- [ ] `curl http://localhost:5000/health` returns `{"status":"ok"}`
- [ ] `curl http://localhost:5000/analyze` with a valid local path returns nodes + communities
- [ ] New context nodes created via UI have `confidence: 'INFERRED'` set
- [ ] AST-extracted nodes have `confidence: 'EXTRACTED'`, `sourceFile`, `sourceLine` set
- [ ] `docker-compose up -d --build` starts all 5 containers: nginx, api, web, graph-service, redis, mongo
- [ ] MongoDB has 4 collections: `repositories`, `context_nodes`, `context_edges`, `communities`
- [ ] Redis has `community:{id}:prompt` and `repo:{id}:graph_report` keys after analysis
- [ ] No existing Repos/Nodes/Search/AI/Export functionality is broken
```
