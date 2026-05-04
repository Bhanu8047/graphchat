# VectorGraph — Agent Build Prompt

> **Instructions for the agent:** Read this entire document before writing a single line of code. All architectural decisions are final. Your job is to implement them exactly as specified, in the order defined in the Build Order section. Ask no clarifying questions — everything you need is here.

---

## 1. What You Are Building

**VectorGraph** is a repository context graph tool for AI agents (Claude, GPT, Gemini, open-source LLMs). It lets engineering teams store structured context about their codebases — modules, APIs, schemas, entry points, configs — in a vector-searchable graph so that AI agents can retrieve full repository context in a single query instead of many.

**Core capabilities:**
- Add repositories and tag them with typed context nodes
- D3 force-directed graph visualization of repos and their nodes
- Vector search across all context nodes (semantic similarity)
- AI-powered context node suggestions from pasted code or docs
- One-click agent-ready JSON export (token-efficient, structured as Map)
- Pluggable embedding and LLM providers — switch via env vars, no code changes

---

## 2. Decisions Already Made — Do Not Change

| Decision | Choice | Reason |
|---|---|---|
| Monorepo | NX | First-class NestJS + Next.js support, shared libs |
| Backend | NestJS (TypeScript) | Same language as frontend, shared types, NX native |
| Frontend | Next.js (TypeScript) | React, App Router, Tailwind |
| Vector DB — Redis | Redis Stack (HNSW) | Fast in-memory KNN, great for search |
| Vector DB — Mongo | MongoDB 7+ | Persistent storage, Atlas Vector Search |
| Embeddings | Voyage AI `voyage-code-3` (default) | Code-optimized, 1024 dims, MongoDB partnership |
| LLM | Multi-provider factory | Claude / GPT / Gemini / Ollama / OpenRouter |
| Reverse proxy | Nginx | SSL termination, route `/api` → NestJS, `/` → Next.js |
| Deployment | Docker Compose on VPS | Self-hosted, reproducible |
| SSL | Let's Encrypt + Certbot | Free, auto-renewable |
| Embedding dims | **1024** | Matches `voyage-code-3`, `mxbai-embed-large`, Ollama `nomic-embed-text` |
| Package manager | npm | Consistent across NX workspace |

---

## 3. Repository Structure

Build exactly this structure — no additions, no deviations:

```
vectorgraph/
├── apps/
│   ├── api/                              # NestJS — port 3001
│   │   └── src/
│   │       ├── app/
│   │       │   ├── app.module.ts
│   │       │   ├── repos/
│   │       │   │   ├── repos.module.ts
│   │       │   │   ├── repos.service.ts
│   │       │   │   └── repos.controller.ts
│   │       │   ├── nodes/
│   │       │   │   ├── nodes.module.ts
│   │       │   │   ├── nodes.service.ts
│   │       │   │   └── nodes.controller.ts
│   │       │   ├── search/
│   │       │   │   ├── search.module.ts
│   │       │   │   ├── search.service.ts
│   │       │   │   └── search.controller.ts
│   │       │   ├── ai/
│   │       │   │   ├── ai.module.ts
│   │       │   │   ├── ai.service.ts
│   │       │   │   └── ai.controller.ts
│   │       │   └── export/
│   │       │       ├── export.module.ts
│   │       │       ├── export.service.ts
│   │       │       └── export.controller.ts
│   │       └── main.ts
│   └── web/                              # Next.js — port 3000
│       └── src/
│           ├── app/
│           │   ├── layout.tsx
│           │   ├── page.tsx
│           │   └── globals.css
│           ├── components/
│           │   ├── Graph.tsx
│           │   ├── ReposPanel.tsx
│           │   ├── SearchPanel.tsx
│           │   ├── AIPanel.tsx
│           │   ├── ExportPanel.tsx
│           │   └── Sidebar.tsx
│           └── lib/
│               └── api.ts
├── libs/
│   ├── shared-types/
│   │   └── src/
│   │       └── index.ts
│   ├── vector-client/
│   │   └── src/
│   │       ├── redis.service.ts
│   │       ├── mongo.service.ts
│   │       └── index.ts
│   └── ai/
│       └── src/
│           ├── types.ts
│           ├── embedding.service.ts
│           ├── llm.service.ts
│           ├── providers/
│           │   ├── voyage.embed.ts
│           │   ├── openai.embed.ts
│           │   ├── gemini.embed.ts
│           │   ├── ollama.embed.ts
│           │   ├── claude.llm.ts
│           │   ├── openai.llm.ts
│           │   ├── gemini.llm.ts
│           │   └── ollama.llm.ts
│           └── index.ts
├── docker/
│   ├── nginx/
│   │   └── nginx.conf
│   ├── api.Dockerfile
│   └── web.Dockerfile
├── docker-compose.yml                    # Local dev (DB containers only)
├── docker-compose.prod.yml              # Full production stack
├── .env                                  # Local dev secrets (gitignored)
├── .env.prod                             # Production secrets (gitignored)
├── .env.example                          # Committed — no secrets
├── .gitignore
├── nx.json
├── package.json
└── tsconfig.base.json
```

---

## 4. Complete Type Definitions

**`libs/shared-types/src/index.ts`** — implement exactly:

```typescript
export type NodeType    = 'module' | 'api' | 'schema' | 'entry' | 'config' | 'note';
export type AgentType   = 'claude' | 'gpt' | 'gemini' | 'all';
export type EmbeddingProvider = 'voyage' | 'openai' | 'gemini' | 'ollama';
export type LLMProvider       = 'claude' | 'openai' | 'gemini' | 'ollama' | 'openrouter';

export interface ContextNode {
  id:         string;
  repoId:     string;
  type:       NodeType;
  label:      string;
  content:    string;
  tags:       string[];
  embedding?: number[];   // 1024 dims — never send to frontend
  updatedAt:  string;     // ISO string
}

export interface Repository {
  id:          string;
  name:        string;
  description: string;
  techStack:   string[];
  agent:       AgentType;
  nodes:       ContextNode[];  // populated on fetch, embedding stripped
  createdAt:   string;
  updatedAt:   string;
}

export interface VectorSearchResult {
  node:   Omit<ContextNode, 'embedding'>;
  repoId: string;
  score:  number;          // 0–1, higher is better
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

// DTOs (used by API controllers)
export interface CreateRepoDto {
  name:        string;
  description: string;
  techStack:   string[];
  agent:       AgentType;
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
```

---

## 5. AI Library — Full Implementation

**`libs/ai/src/types.ts`**

```typescript
export type VoyageModel =
  | 'voyage-code-3'
  | 'voyage-3'
  | 'voyage-3-large'
  | 'voyage-3-lite';

export interface EmbeddingConfig {
  provider:         EmbeddingProvider;
  voyageApiKey?:    string;
  voyageModel?:     VoyageModel;
  openaiApiKey?:    string;
  openaiEmbedModel?: string;
  geminiApiKey?:    string;
  geminiEmbedModel?: string;
  ollamaBaseUrl?:   string;
  ollamaEmbedModel?: string;
}

export interface LLMConfig {
  provider:           LLMProvider;
  anthropicApiKey?:   string;
  claudeModel?:       string;
  openaiApiKey?:      string;
  openaiModel?:       string;
  geminiApiKey?:      string;
  geminiModel?:       string;
  ollamaBaseUrl?:     string;
  ollamaModel?:       string;
  openrouterApiKey?:  string;
  openrouterModel?:   string;
}

export { EmbeddingProvider, LLMProvider, SuggestResult } from '@vectorgraph/shared-types';
```

**Shared prompt builder — add to `libs/ai/src/providers/_shared.ts`:**

```typescript
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
```

**`libs/ai/src/providers/voyage.embed.ts`**
```typescript
import OpenAI from 'openai';
import { EmbeddingConfig } from '../types';

export async function voyageEmbed(texts: string[], cfg: EmbeddingConfig): Promise<number[][]> {
  const client = new OpenAI({
    apiKey:  cfg.voyageApiKey,
    baseURL: 'https://api.voyageai.com/v1',
  });
  const res = await client.embeddings.create({
    model: cfg.voyageModel ?? 'voyage-code-3',
    input: texts,
  });
  return res.data.map(d => d.embedding);
}
```

**`libs/ai/src/providers/openai.embed.ts`**
```typescript
import OpenAI from 'openai';
import { EmbeddingConfig } from '../types';

export async function openaiEmbed(texts: string[], cfg: EmbeddingConfig): Promise<number[][]> {
  const client = new OpenAI({ apiKey: cfg.openaiApiKey });
  const res = await client.embeddings.create({
    model: cfg.openaiEmbedModel ?? 'text-embedding-3-small',
    input: texts,
  });
  return res.data.map(d => d.embedding);
}
```

**`libs/ai/src/providers/gemini.embed.ts`**
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { EmbeddingConfig } from '../types';

export async function geminiEmbed(texts: string[], cfg: EmbeddingConfig): Promise<number[][]> {
  const genAI = new GoogleGenerativeAI(cfg.geminiApiKey!);
  const model = genAI.getGenerativeModel({ model: cfg.geminiEmbedModel ?? 'text-embedding-004' });
  const results = await Promise.all(texts.map(t => model.embedContent(t)));
  return results.map(r => r.embedding.values);
}
```

**`libs/ai/src/providers/ollama.embed.ts`**
```typescript
import OpenAI from 'openai';
import { EmbeddingConfig } from '../types';

export async function ollamaEmbed(texts: string[], cfg: EmbeddingConfig): Promise<number[][]> {
  const client = new OpenAI({
    apiKey:  'ollama',
    baseURL: `${cfg.ollamaBaseUrl ?? 'http://localhost:11434'}/v1`,
  });
  const res = await client.embeddings.create({
    model: cfg.ollamaEmbedModel ?? 'nomic-embed-text',
    input: texts,
  });
  return res.data.map(d => d.embedding);
}
```

**`libs/ai/src/providers/claude.llm.ts`**
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { LLMConfig, SuggestResult } from '../types';
import { buildPrompt, parseJSON } from './_shared';

export async function claudeSuggest(repoName: string, input: string, cfg: LLMConfig): Promise<SuggestResult> {
  const client = new Anthropic({ apiKey: cfg.anthropicApiKey });
  const msg = await client.messages.create({
    model: cfg.claudeModel ?? 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: buildPrompt(repoName, input) }],
  });
  return parseJSON(msg.content.map(c => c.type === 'text' ? c.text : '').join(''));
}
```

**`libs/ai/src/providers/openai.llm.ts`**
```typescript
import OpenAI from 'openai';
import { LLMConfig, SuggestResult } from '../types';
import { buildPrompt } from './_shared';

export async function openaiSuggest(repoName: string, input: string, cfg: LLMConfig): Promise<SuggestResult> {
  const client = new OpenAI({ apiKey: cfg.openaiApiKey });
  const res = await client.chat.completions.create({
    model: cfg.openaiModel ?? 'gpt-4o-mini',
    messages: [{ role: 'user', content: buildPrompt(repoName, input) }],
    response_format: { type: 'json_object' },
  });
  return JSON.parse(res.choices[0].message.content!);
}
```

**`libs/ai/src/providers/gemini.llm.ts`**
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMConfig, SuggestResult } from '../types';
import { buildPrompt } from './_shared';

export async function geminiSuggest(repoName: string, input: string, cfg: LLMConfig): Promise<SuggestResult> {
  const genAI = new GoogleGenerativeAI(cfg.geminiApiKey!);
  const model = genAI.getGenerativeModel({
    model: cfg.geminiModel ?? 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });
  const res = await model.generateContent(buildPrompt(repoName, input));
  return JSON.parse(res.response.text());
}
```

**`libs/ai/src/providers/ollama.llm.ts`**
```typescript
import OpenAI from 'openai';
import { LLMConfig, SuggestResult } from '../types';
import { buildPrompt, parseJSON } from './_shared';

export async function ollamaSuggest(repoName: string, input: string, cfg: LLMConfig): Promise<SuggestResult> {
  const isOpenRouter = cfg.provider === 'openrouter';
  const client = new OpenAI({
    apiKey:  isOpenRouter ? cfg.openrouterApiKey : 'ollama',
    baseURL: isOpenRouter
      ? 'https://openrouter.ai/api/v1'
      : `${cfg.ollamaBaseUrl ?? 'http://localhost:11434'}/v1`,
  });
  const res = await client.chat.completions.create({
    model: isOpenRouter
      ? (cfg.openrouterModel ?? 'meta-llama/llama-3.1-8b-instruct:free')
      : (cfg.ollamaModel ?? 'llama3.2'),
    messages: [{ role: 'user', content: buildPrompt(repoName, input) }],
  });
  return parseJSON(res.choices[0].message.content!);
}
```

**`libs/ai/src/embedding.service.ts`**
```typescript
import { EmbeddingConfig } from './types';
import { voyageEmbed } from './providers/voyage.embed';
import { openaiEmbed } from './providers/openai.embed';
import { geminiEmbed } from './providers/gemini.embed';
import { ollamaEmbed } from './providers/ollama.embed';

export async function getEmbedding(text: string, cfg: EmbeddingConfig): Promise<number[]> {
  const [v] = await getEmbeddings([text], cfg);
  return v;
}

export async function getEmbeddings(texts: string[], cfg: EmbeddingConfig): Promise<number[][]> {
  switch (cfg.provider) {
    case 'voyage': return voyageEmbed(texts, cfg);
    case 'openai': return openaiEmbed(texts, cfg);
    case 'gemini': return geminiEmbed(texts, cfg);
    case 'ollama': return ollamaEmbed(texts, cfg);
    default: throw new Error(`Unknown embedding provider: ${cfg.provider}`);
  }
}
```

**`libs/ai/src/llm.service.ts`**
```typescript
import { LLMConfig, SuggestResult } from './types';
import { claudeSuggest }  from './providers/claude.llm';
import { openaiSuggest }  from './providers/openai.llm';
import { geminiSuggest }  from './providers/gemini.llm';
import { ollamaSuggest }  from './providers/ollama.llm';

export async function suggestContextNode(repoName: string, input: string, cfg: LLMConfig): Promise<SuggestResult> {
  switch (cfg.provider) {
    case 'claude':     return claudeSuggest(repoName, input, cfg);
    case 'openai':     return openaiSuggest(repoName, input, cfg);
    case 'gemini':     return geminiSuggest(repoName, input, cfg);
    case 'ollama':
    case 'openrouter': return ollamaSuggest(repoName, input, cfg);
    default: throw new Error(`Unknown LLM provider: ${cfg.provider}`);
  }
}
```

**`libs/ai/src/index.ts`**
```typescript
export { getEmbedding, getEmbeddings } from './embedding.service';
export { suggestContextNode }          from './llm.service';
export * from './types';
```

---

## 6. Vector Client — Full Implementation

**`libs/vector-client/src/redis.service.ts`**

> IMPORTANT: DIM is **1024** (voyage-code-3 / mxbai-embed-large / nomic-embed-text all output 1024 dims)

```typescript
import { createClient, SchemaFieldTypes, VectorAlgorithms } from '@redis/client';
import { ContextNode } from '@vectorgraph/shared-types';

export class RedisVectorService {
  private client = createClient({ url: process.env.REDIS_URL ?? 'redis://localhost:6379' });

  async connect(): Promise<void> {
    await this.client.connect();
    await this.ensureIndex();
  }

  private async ensureIndex(): Promise<void> {
    try {
      await this.client.ft.create('idx:context', {
        '$.repoId':    { type: SchemaFieldTypes.TAG,  AS: 'repoId'  },
        '$.type':      { type: SchemaFieldTypes.TAG,   AS: 'type'    },
        '$.label':     { type: SchemaFieldTypes.TEXT,  AS: 'label'   },
        '$.content':   { type: SchemaFieldTypes.TEXT,  AS: 'content' },
        '$.tags.*':    { type: SchemaFieldTypes.TAG,   AS: 'tags'    },
        '$.embedding': {
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
    }
  }

  async storeNode(node: ContextNode, embedding: number[]): Promise<void> {
    await this.client.json.set(`context:${node.id}`, '$', { ...node, embedding });
  }

  async deleteNode(id: string): Promise<void> {
    await this.client.del(`context:${id}`);
  }

  async deleteByRepo(repoId: string): Promise<void> {
    const keys = await this.client.keys(`context:*`);
    for (const key of keys) {
      const rid = await this.client.json.get(key, { path: '$.repoId' });
      if (Array.isArray(rid) && rid[0] === repoId) await this.client.del(key);
    }
  }

  async search(
    queryEmbedding: number[],
    options: { repoId?: string; type?: string; k?: number } = {}
  ): Promise<Array<{ node: ContextNode; score: number }>> {
    const { repoId, type, k = 10 } = options;
    const filters: string[] = [];
    if (repoId) filters.push(`@repoId:{${repoId}}`);
    if (type)   filters.push(`@type:{${type}}`);
    const filter = filters.length ? filters.join(' ') : '*';
    const blob = Buffer.from(new Float32Array(queryEmbedding).buffer);
    const res = await this.client.ft.search(
      'idx:context',
      `(${filter})=>[KNN ${k} @embedding $BLOB AS __score]`,
      { PARAMS: { BLOB: blob }, DIALECT: 2, RETURN: ['$', '__score'] }
    );
    return res.documents.map(doc => ({
      node:  JSON.parse(doc.value['$'] as string) as ContextNode,
      score: 1 - parseFloat(doc.value['__score'] as string),
    }));
  }
}
```

**`libs/vector-client/src/mongo.service.ts`**

```typescript
import { MongoClient, Collection, Document } from 'mongodb';
import { ContextNode, Repository } from '@vectorgraph/shared-types';

type NodeDoc = ContextNode & { embedding: number[] };

export class MongoVectorService {
  private client: MongoClient;
  private repoCol!: Collection<Repository>;
  private nodeCol!: Collection<NodeDoc>;

  constructor(uri?: string) {
    this.client = new MongoClient(uri ?? process.env.MONGODB_URI!);
  }

  async connect(): Promise<void> {
    await this.client.connect();
    const db = this.client.db('vectorgraph');
    this.repoCol = db.collection<Repository>('repositories');
    this.nodeCol = db.collection<NodeDoc>('context_nodes');
    await this.nodeCol.createIndex({ repoId: 1 });
    await this.nodeCol.createIndex({ type: 1 });
    // Atlas Vector Search index must be created separately via Atlas UI or CLI:
    // Field: embedding | Type: vector | Dims: 1024 | Similarity: cosine
    // Filter fields: repoId (token), type (token)
  }

  // ── Repositories ──────────────────────────────────────────────
  async saveRepo(repo: Repository): Promise<void> {
    await this.repoCol.updateOne({ id: repo.id }, { $set: repo }, { upsert: true });
  }

  async getRepo(id: string): Promise<Repository | null> {
    return this.repoCol.findOne({ id }, { projection: { _id: 0 } });
  }

  async getAllRepos(): Promise<Repository[]> {
    const repos = await this.repoCol.find({}, { projection: { _id: 0 } }).toArray();
    // Attach nodes (without embeddings) to each repo
    return Promise.all(repos.map(async repo => ({
      ...repo,
      nodes: await this.getNodes(repo.id),
    })));
  }

  async deleteRepo(id: string): Promise<void> {
    await this.repoCol.deleteOne({ id });
    await this.nodeCol.deleteMany({ repoId: id });
  }

  // ── Context Nodes ─────────────────────────────────────────────
  async saveNode(node: ContextNode, embedding: number[]): Promise<void> {
    await this.nodeCol.updateOne(
      { id: node.id },
      { $set: { ...node, embedding, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
  }

  async getNodes(repoId: string): Promise<ContextNode[]> {
    return this.nodeCol
      .find({ repoId }, { projection: { _id: 0, embedding: 0 } })
      .toArray();
  }

  async deleteNode(id: string): Promise<void> {
    await this.nodeCol.deleteOne({ id });
  }

  async getContextMap(repoId: string): Promise<Map<string, ContextNode[]>> {
    const nodes = await this.getNodes(repoId);
    const map = new Map<string, ContextNode[]>();
    nodes.forEach(n => { const arr = map.get(n.type) ?? []; arr.push(n); map.set(n.type, arr); });
    return map;
  }

  async vectorSearch(
    queryEmbedding: number[],
    options: { repoId?: string; type?: string; limit?: number } = {}
  ): Promise<Array<{ node: ContextNode; score: number }>> {
    const { repoId, type, limit = 10 } = options;
    const filter: Document = {};
    if (repoId) filter.repoId = repoId;
    if (type)   filter.type   = type;

    const pipeline: Document[] = [
      {
        $vectorSearch: {
          index: 'ctx_vector_idx',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: limit * 10,
          limit,
          ...(Object.keys(filter).length ? { filter } : {}),
        },
      },
      { $project: { embedding: 0, _id: 0, score: { $meta: 'vectorSearchScore' } } },
    ];

    const docs = await this.nodeCol.aggregate<NodeDoc & { score: number }>(pipeline).toArray();
    return docs.map(({ score, ...node }) => ({ node: node as ContextNode, score }));
  }
}
```

**`libs/vector-client/src/index.ts`**
```typescript
export { RedisVectorService } from './redis.service';
export { MongoVectorService } from './mongo.service';
```

---

## 7. NestJS API — Full Module Implementations

### `apps/api/src/main.ts`
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.WEB_URL ?? 'http://localhost:3000' });
  app.setGlobalPrefix('api');
  await app.listen(3001);
}
bootstrap();
```

### `apps/api/src/app/app.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReposModule }  from './repos/repos.module';
import { NodesModule }  from './nodes/nodes.module';
import { SearchModule } from './search/search.module';
import { AiModule }     from './ai/ai.module';
import { ExportModule } from './export/export.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ReposModule, NodesModule, SearchModule, AiModule, ExportModule,
  ],
})
export class AppModule {}
```

### Repos Module
```typescript
// repos.service.ts
import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoVectorService } from '@vectorgraph/vector-client';
import { Repository, CreateRepoDto } from '@vectorgraph/shared-types';
import { v4 as uuid } from 'uuid';

@Injectable()
export class ReposService implements OnModuleInit {
  private mongo: MongoVectorService;
  constructor(private cfg: ConfigService) {
    this.mongo = new MongoVectorService(cfg.get('MONGODB_URI'));
  }
  async onModuleInit() { await this.mongo.connect(); }

  findAll()                     { return this.mongo.getAllRepos(); }
  async findOne(id: string)     {
    const r = await this.mongo.getRepo(id);
    if (!r) throw new NotFoundException(`Repo ${id} not found`);
    return r;
  }
  create(dto: CreateRepoDto): Promise<void> & { repo: Repository } {
    const repo: Repository = {
      id: uuid(), nodes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...dto,
    };
    return Object.assign(this.mongo.saveRepo(repo).then(() => repo), { repo });
  }
  async remove(id: string) {
    await this.findOne(id);
    return this.mongo.deleteRepo(id);
  }
}

// repos.controller.ts
import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { ReposService } from './repos.service';
import { CreateRepoDto } from '@vectorgraph/shared-types';

@Controller('repos')
export class ReposController {
  constructor(private svc: ReposService) {}
  @Get()         findAll()                        { return this.svc.findAll(); }
  @Get(':id')    findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post()        create(@Body() dto: CreateRepoDto){ return this.svc.create(dto); }
  @Delete(':id') remove(@Param('id') id: string)  { return this.svc.remove(id); }
}
```

### Nodes Module
```typescript
// nodes.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoVectorService, RedisVectorService } from '@vectorgraph/vector-client';
import { getEmbedding, EmbeddingConfig } from '@vectorgraph/ai';
import { ContextNode, CreateNodeDto } from '@vectorgraph/shared-types';
import { v4 as uuid } from 'uuid';

@Injectable()
export class NodesService implements OnModuleInit {
  private mongo: MongoVectorService;
  private redis: RedisVectorService;
  private embedCfg: EmbeddingConfig;

  constructor(private cfg: ConfigService) {
    this.mongo = new MongoVectorService(cfg.get('MONGODB_URI'));
    this.redis = new RedisVectorService();
    this.embedCfg = {
      provider:      cfg.get('EMBEDDING_PROVIDER', 'voyage'),
      voyageApiKey:  cfg.get('VOYAGE_API_KEY'),
      voyageModel:   cfg.get('VOYAGE_MODEL', 'voyage-code-3'),
      openaiApiKey:  cfg.get('OPENAI_API_KEY'),
      geminiApiKey:  cfg.get('GEMINI_API_KEY'),
      ollamaBaseUrl: cfg.get('OLLAMA_BASE_URL'),
      ollamaEmbedModel: cfg.get('OLLAMA_EMBED_MODEL'),
    };
  }

  async onModuleInit() {
    await this.mongo.connect();
    await this.redis.connect();
  }

  async create(dto: CreateNodeDto): Promise<ContextNode> {
    const node: ContextNode = {
      id: uuid(),
      updatedAt: new Date().toISOString(),
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

  async remove(id: string): Promise<void> {
    await Promise.all([
      this.mongo.deleteNode(id),
      this.redis.deleteNode(id),
    ]);
  }
}

// nodes.controller.ts
import { Controller, Post, Delete, Param, Body } from '@nestjs/common';
import { NodesService } from './nodes.service';
import { CreateNodeDto } from '@vectorgraph/shared-types';

@Controller('nodes')
export class NodesController {
  constructor(private svc: NodesService) {}
  @Post()        create(@Body() dto: CreateNodeDto)  { return this.svc.create(dto); }
  @Delete(':id') remove(@Param('id') id: string)     { return this.svc.remove(id); }
}
```

### Search Module
```typescript
// search.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisVectorService } from '@vectorgraph/vector-client';
import { getEmbedding, EmbeddingConfig } from '@vectorgraph/ai';
import { SearchQueryDto, VectorSearchResult } from '@vectorgraph/shared-types';

@Injectable()
export class SearchService implements OnModuleInit {
  private redis: RedisVectorService;
  private embedCfg: EmbeddingConfig;

  constructor(private cfg: ConfigService) {
    this.redis = new RedisVectorService();
    this.embedCfg = {
      provider:      cfg.get('EMBEDDING_PROVIDER', 'voyage'),
      voyageApiKey:  cfg.get('VOYAGE_API_KEY'),
      voyageModel:   cfg.get('VOYAGE_MODEL', 'voyage-code-3'),
      openaiApiKey:  cfg.get('OPENAI_API_KEY'),
      geminiApiKey:  cfg.get('GEMINI_API_KEY'),
      ollamaBaseUrl: cfg.get('OLLAMA_BASE_URL'),
      ollamaEmbedModel: cfg.get('OLLAMA_EMBED_MODEL'),
    };
  }

  async onModuleInit() { await this.redis.connect(); }

  async search(dto: SearchQueryDto): Promise<VectorSearchResult[]> {
    const embedding = await getEmbedding(dto.q, this.embedCfg);
    const results = await this.redis.search(embedding, {
      repoId: dto.repoId,
      type:   dto.type,
      k:      dto.k ?? 10,
    });
    return results.map(r => ({
      node:   r.node,
      repoId: r.node.repoId,
      score:  r.score,
    }));
  }
}

// search.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private svc: SearchService) {}
  @Get() search(@Query() dto: any) { return this.svc.search(dto); }
}
```

### AI Module
```typescript
// ai.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { suggestContextNode, LLMConfig } from '@vectorgraph/ai';
import { SuggestDto } from '@vectorgraph/shared-types';

@Injectable()
export class AiService {
  private llmCfg: LLMConfig;
  constructor(private cfg: ConfigService) {
    this.llmCfg = {
      provider:          cfg.get('LLM_PROVIDER', 'claude'),
      anthropicApiKey:   cfg.get('ANTHROPIC_API_KEY'),
      claudeModel:       cfg.get('CLAUDE_MODEL', 'claude-sonnet-4-20250514'),
      openaiApiKey:      cfg.get('OPENAI_API_KEY'),
      openaiModel:       cfg.get('OPENAI_MODEL', 'gpt-4o-mini'),
      geminiApiKey:      cfg.get('GEMINI_API_KEY'),
      geminiModel:       cfg.get('GEMINI_MODEL', 'gemini-2.0-flash'),
      ollamaBaseUrl:     cfg.get('OLLAMA_BASE_URL', 'http://localhost:11434'),
      ollamaModel:       cfg.get('OLLAMA_MODEL', 'llama3.2'),
      openrouterApiKey:  cfg.get('OPENROUTER_API_KEY'),
      openrouterModel:   cfg.get('OPENROUTER_MODEL', 'meta-llama/llama-3.1-8b-instruct:free'),
    };
  }

  async suggest(dto: SuggestDto) {
    return suggestContextNode(dto.repoId, dto.input, this.llmCfg);
  }
}

// ai.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private svc: AiService) {}
  @Post('suggest') suggest(@Body() dto: any) { return this.svc.suggest(dto); }
}
```

### Export Module
```typescript
// export.service.ts
import { Injectable } from '@nestjs/common';
import { MongoVectorService } from '@vectorgraph/vector-client';
import { AgentExportPayload, NodeType } from '@vectorgraph/shared-types';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ExportService {
  private mongo: MongoVectorService;
  constructor(cfg: ConfigService) {
    this.mongo = new MongoVectorService(cfg.get('MONGODB_URI'));
  }
  async onModuleInit() { await this.mongo.connect(); }

  async exportRepo(repoId: string): Promise<AgentExportPayload> {
    const repo = await this.mongo.getRepo(repoId);
    if (!repo) throw new Error(`Repo ${repoId} not found`);
    const contextMap = await this.mongo.getContextMap(repoId);
    const nodeTypes: NodeType[] = ['module','api','schema','entry','config','note'];

    return {
      repository:  { name: repo.name, description: repo.description, techStack: repo.techStack, agent: repo.agent },
      contextMap:  Object.fromEntries(nodeTypes.map(t => [t, (contextMap.get(t) ?? []).map(({ id, repoId: _, embedding: __, ...rest }) => rest)])) as AgentExportPayload['contextMap'],
      vectorIndex: repo.nodes.map(n => ({ id: n.id, type: n.type, label: n.label, tags: n.tags })),
      agentHint:   'Fetch this payload once per session. Use contextMap[type] for targeted lookup. Use vectorIndex ids to run semantic search.',
      meta:        { totalNodes: repo.nodes.length, lastUpdated: repo.updatedAt, format: 'VectorGraph-v1' },
    };
  }
}

// export.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { ExportService } from './export.service';

@Controller('export')
export class ExportController {
  constructor(private svc: ExportService) {}
  @Get(':id') export(@Param('id') id: string) { return this.svc.exportRepo(id); }
}
```

---

## 8. Environment Variables

**`.env.example`** (commit this — no real secrets):
```env
# ── Embedding ───────────────────────────────────────────────────
EMBEDDING_PROVIDER=voyage
VOYAGE_API_KEY=your_voyage_api_key_here
VOYAGE_MODEL=voyage-code-3

# Alternatives (uncomment to use)
# OPENAI_API_KEY=sk-...
# OPENAI_EMBED_MODEL=text-embedding-3-small
# GEMINI_API_KEY=AIza...
# OLLAMA_BASE_URL=http://localhost:11434
# OLLAMA_EMBED_MODEL=nomic-embed-text

# ── LLM ─────────────────────────────────────────────────────────
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=your_anthropic_key_here
CLAUDE_MODEL=claude-sonnet-4-20250514

# Alternatives (uncomment to use)
# OPENAI_MODEL=gpt-4o-mini
# GEMINI_MODEL=gemini-2.0-flash
# OLLAMA_MODEL=llama3.2
# OPENROUTER_API_KEY=sk-or-...
# OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free

# ── Databases ───────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb://root:secret@localhost:27017/vectorgraph?authSource=admin

# ── App ─────────────────────────────────────────────────────────
WEB_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NODE_ENV=development
```

---

## 9. Docker Configuration

**`docker/api.Dockerfile`**
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS builder
COPY . .
RUN npx nx build api --prod

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist/apps/api ./dist
COPY --from=deps    /app/node_modules  ./node_modules
EXPOSE 3001
CMD ["node", "dist/main.js"]
```

**`docker/web.Dockerfile`**
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS builder
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npx nx build web --prod

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist/apps/web/.next/standalone  ./
COPY --from=builder /app/dist/apps/web/public            ./public
COPY --from=builder /app/dist/apps/web/.next/static      ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

**`docker-compose.yml`** (local dev — DB containers only)
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
volumes:
  redis_data:
  mongo_data:
```

**`docker-compose.prod.yml`**
```yaml
version: '3.9'
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - certbot_www:/var/www/certbot:ro
    depends_on: [api, web]
    restart: always

  api:
    build: { context: ., dockerfile: docker/api.Dockerfile }
    env_file: .env.prod
    depends_on: [redis, mongo]
    restart: always

  web:
    build:
      context: .
      dockerfile: docker/web.Dockerfile
      args:
        NEXT_PUBLIC_API_URL: https://yourdomain.com/api
    env_file: .env.prod
    restart: always

  redis:
    image: redis/redis-stack-server:latest
    volumes: [redis_data:/data]
    restart: always

  mongo:
    image: mongo:7
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
    volumes: [mongo_data:/data/db]
    restart: always

  certbot:
    image: certbot/certbot
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt
      - certbot_www:/var/www/certbot

volumes:
  redis_data:
  mongo_data:
  certbot_www:
```

**`docker/nginx/nginx.conf`**
```nginx
events { worker_connections 1024; }
http {
  upstream api { server api:3001; }
  upstream web { server web:3000; }

  server {
    listen 80;
    server_name yourdomain.com;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
  }

  server {
    listen 443 ssl;
    server_name yourdomain.com;
    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    location /api/ {
      proxy_pass         http://api/api/;
      proxy_http_version 1.1;
      proxy_set_header   Host $host;
      proxy_set_header   Upgrade $http_upgrade;
      proxy_set_header   Connection 'upgrade';
    }
    location / {
      proxy_pass         http://web;
      proxy_http_version 1.1;
      proxy_set_header   Host $host;
      proxy_set_header   Upgrade $http_upgrade;
      proxy_set_header   Connection 'upgrade';
    }
  }
}
```

---

## 10. Build Order for the Agent

Execute these steps **in order**. Do not skip ahead.

```
Step 1 — Scaffold
  npx create-nx-workspace@latest vectorgraph --preset=ts --packageManager=npm --nxCloud=skip
  cd vectorgraph
  npm install -D @nx/nest @nx/next @nx/node @nx/js

Step 2 — Generate apps and libs
  nx g @nx/nest:app api --directory=apps/api
  nx g @nx/next:app web --directory=apps/web --style=tailwind
  nx g @nx/js:lib shared-types --directory=libs/shared-types --bundler=tsc
  nx g @nx/js:lib vector-client --directory=libs/vector-client --bundler=tsc
  nx g @nx/js:lib ai --directory=libs/ai --bundler=tsc

Step 3 — Install runtime dependencies
  npm install @redis/client mongodb @anthropic-ai/sdk openai @google/generative-ai uuid @nestjs/config
  npm install -D @types/uuid

Step 4 — Implement libs (in order)
  4a. libs/shared-types   (types only — no external imports)
  4b. libs/ai             (embedding + LLM providers)
  4c. libs/vector-client  (Redis + MongoDB services)

Step 5 — Implement NestJS API modules (in order)
  5a. app.module.ts
  5b. repos module
  5c. nodes module (depends on vector-client + ai)
  5d. search module (depends on vector-client + ai)
  5e. ai module (depends on ai lib)
  5f. export module (depends on vector-client)

Step 6 — Implement Next.js frontend
  6a. lib/api.ts
  6b. components (Graph, ReposPanel, SearchPanel, AIPanel, ExportPanel, Sidebar)
  6c. app/page.tsx (assemble tabs)

Step 7 — Docker + config files
  7a. docker/api.Dockerfile
  7b. docker/web.Dockerfile
  7c. docker-compose.yml
  7d. docker-compose.prod.yml
  7e. docker/nginx/nginx.conf
  7f. .env.example
  7g. .gitignore

Step 8 — Verify locally
  docker-compose up -d          # start Redis + Mongo
  nx serve api                  # should start on :3001
  nx dev web                    # should start on :3000
  curl http://localhost:3001/api/repos   # should return []
```

---

## 11. Frontend API Client

**`apps/web/src/lib/api.ts`**
```typescript
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

const json = (res: Response) => { if (!res.ok) throw new Error(res.statusText); return res.json(); };
const h = { 'Content-Type': 'application/json' };

export const api = {
  repos: {
    list:    ()           => fetch(`${BASE}/repos`).then(json),
    get:     (id: string) => fetch(`${BASE}/repos/${id}`).then(json),
    create:  (body: any)  => fetch(`${BASE}/repos`, { method: 'POST', headers: h, body: JSON.stringify(body) }).then(json),
    delete:  (id: string) => fetch(`${BASE}/repos/${id}`, { method: 'DELETE' }),
  },
  nodes: {
    create: (body: any)  => fetch(`${BASE}/nodes`, { method: 'POST', headers: h, body: JSON.stringify(body) }).then(json),
    delete: (id: string) => fetch(`${BASE}/nodes/${id}`, { method: 'DELETE' }),
  },
  search: {
    query: (q: string, repoId?: string, type?: string, k?: number) => {
      const params = new URLSearchParams({ q, ...(repoId && { repoId }), ...(type && { type }), ...(k && { k: String(k) }) });
      return fetch(`${BASE}/search?${params}`).then(json);
    },
  },
  ai: {
    suggest: (repoId: string, input: string) =>
      fetch(`${BASE}/ai/suggest`, { method: 'POST', headers: h, body: JSON.stringify({ repoId, input }) }).then(json),
  },
  export: {
    repo: (id: string) => fetch(`${BASE}/export/${id}`).then(json),
  },
};
```

---

## 12. Definition of Done

The build is complete when all of the following are true:

- [ ] `nx serve api` starts without errors, all 5 route groups respond (`/repos`, `/nodes`, `/search`, `/ai/suggest`, `/export/:id`)
- [ ] `nx dev web` starts without errors, all 5 tabs render (Graph, Repos, Search, AI Assist, Export)
- [ ] Adding a repo via the UI persists to MongoDB
- [ ] Adding a context node generates a Voyage AI embedding and stores it in both Redis and MongoDB
- [ ] Search returns ranked results with cosine similarity scores
- [ ] AI Assist returns a structured context node suggestion using the configured LLM provider
- [ ] Export returns a valid `AgentExportPayload` JSON
- [ ] Changing `LLM_PROVIDER` or `EMBEDDING_PROVIDER` in `.env` switches providers with no code changes
- [ ] `docker-compose -f docker-compose.prod.yml up --build` starts all containers cleanly
- [ ] Nginx routes `/api/*` to NestJS and `/*` to Next.js correctly
- [ ] HTTPS works with a valid Let's Encrypt certificate
