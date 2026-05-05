# GRAPHCHAT — Agent Implementation Prompt
## Priority 3 & 4: CLI Tool + Advanced Graph Features

> **Read this entire document before writing a single line of code.**
> This builds directly on top of Priority 1 & 2 (token minimization + Python graph sidecar).
> Confirm Priority 1 & 2 Definition of Done is fully passing before starting here.
> All decisions are final. Implement in the exact order defined in the Build Order section.
> Do not refactor existing working code unless explicitly instructed.

---

## 0. Current State After Priority 1 & 2

The monorepo now has:

```
vectorgraph/
├── apps/
│   ├── api/        NestJS :3001 — repos, nodes, search, ai, export, graph modules
│   └── web/        Next.js :3000 — 5-tab UI
├── libs/
│   ├── shared-types/   extended with EdgeType, EdgeConfidence, Community, ContextEdge
│   ├── vector-client/  Redis (with confidence filter + budget), MongoDB
│   └── ai/             multi-provider embedding + LLM
├── graph-service/  Python FastAPI :5000 — Tree-sitter, NetworkX, Leiden
└── docker/         5-container stack
```

**What we are adding in Priority 3 & 4:**

```
Priority 3 — CLI tool (new NX app)
  apps/cli/          TypeScript Commander.js CLI
  Commands:          login, logout, status, index, search, query, path, explain,
                     export, watch, repos, report
  Auth:              API key → JWT exchange, auto-refresh interceptor
  Distribution:      npm package + standalone binary via bun compile

Priority 4 — Advanced graph features
  Incremental file watching + delta reindex (NestJS chokidar watcher)
  Cross-repo graph merging (graph-service /merge endpoint)
  Git hook integration (auto-reindex on commit/checkout)
  SQL schema AST extraction (graph-service)
  God node + path query endpoints (NestJS GraphController additions)
  GRAPH_REPORT wiki export (graph-service /wiki endpoint)
```

---

## 1. Auth System (NestJS — required before CLI)

Priority 3 CLI needs authentication endpoints. Implement these in NestJS first.

### 1a. Install Auth Dependencies

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install -D @types/passport-jwt @types/bcrypt
```

### 1b. New MongoDB Collections Schema

The auth system needs two new collections. Add index creation to `libs/vector-client/src/mongo.service.ts` inside `connect()`:

```typescript
// Add after existing index creation
await this.client.db('vectorgraph').collection('users').createIndex({ email: 1 }, { unique: true });
await this.client.db('vectorgraph').collection('api_keys').createIndex({ keyId: 1 }, { unique: true });
await this.client.db('vectorgraph').collection('api_keys').createIndex({ userId: 1 });
await this.client.db('vectorgraph').collection('refresh_tokens').createIndex({ token: 1 }, { unique: true });
await this.client.db('vectorgraph').collection('refresh_tokens').createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 } // TTL index — MongoDB auto-deletes expired tokens
);
```

### 1c. Auth Types — add to `libs/shared-types/src/index.ts`

```typescript
// ── Auth types ────────────────────────────────────────────────────────────────
export interface User {
  id:           string;
  email:        string;
  passwordHash: string;
  teamId:       string;
  role:         'admin' | 'member';
  createdAt:    string;
}

export interface ApiKey {
  id:        string;
  keyId:     string;          // prefix of the key (public part)
  secretHash: string;         // bcrypt hash of the secret (private part)
  userId:    string;
  teamId:    string;
  label:     string;          // human label: "My Laptop", "CI Pipeline"
  scopes:    string[];        // ['read', 'write', 'analyze'] etc.
  lastUsed?: string;
  createdAt: string;
}

export interface RefreshToken {
  token:     string;          // opaque random token (stored hashed)
  userId:    string;
  expiresAt: Date;
  createdAt: string;
}

export interface JwtPayload {
  sub:    string;             // userId
  teamId: string;
  scopes: string[];
  iat?:   number;
  exp?:   number;
}

export interface TokenResponse {
  access_token:  string;
  refresh_token: string;
  expires_in:    number;      // seconds
  token_type:    'Bearer';
}

export interface GenerateKeyResponse {
  key:        string;         // shown ONCE: sk-graphchat-{keyId}.{secret}
  keyId:      string;
  label:      string;
  createdAt:  string;
}

// DTOs
export interface ExchangeKeyDto  { api_key: string; }
export interface RefreshTokenDto { refresh_token: string; }
export interface GenerateKeyDto  { label: string; scopes?: string[]; }
export interface RegisterDto     { email: string; password: string; teamId?: string; }
export interface LoginDto        { email: string; password: string; }
```

### 1d. `apps/api/src/app/auth/auth.service.ts`

```typescript
import { Injectable, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MongoClient, Collection } from 'mongodb';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import {
  User, ApiKey, RefreshToken, JwtPayload, TokenResponse,
  GenerateKeyResponse, RegisterDto, LoginDto,
} from '@vectorgraph/shared-types';

@Injectable()
export class AuthService implements OnModuleInit {
  private client: MongoClient;
  private users:    Collection<User>;
  private apiKeys:  Collection<ApiKey>;
  private refreshTokens: Collection<RefreshToken>;

  constructor(
    private cfg: ConfigService,
    private jwt: JwtService,
  ) {
    this.client = new MongoClient(cfg.get('MONGODB_URI')!);
  }

  async onModuleInit() {
    await this.client.connect();
    const db = this.client.db('vectorgraph');
    this.users         = db.collection<User>('users');
    this.apiKeys       = db.collection<ApiKey>('api_keys');
    this.refreshTokens = db.collection<RefreshToken>('refresh_tokens');
  }

  // ── User registration / login ─────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<User> {
    const existing = await this.users.findOne({ email: dto.email });
    if (existing) throw new UnauthorizedException('Email already registered');
    const user: User = {
      id:           uuid(),
      email:        dto.email,
      passwordHash: await bcrypt.hash(dto.password, 12),
      teamId:       dto.teamId ?? uuid(),
      role:         'admin',
      createdAt:    new Date().toISOString(),
    };
    await this.users.insertOne(user);
    return user;
  }

  async loginWithPassword(dto: LoginDto): Promise<TokenResponse> {
    const user = await this.users.findOne({ email: dto.email });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens(user);
  }

  // ── API key flow (CLI primary flow) ───────────────────────────────────────
  async generateApiKey(userId: string, label: string, scopes: string[]): Promise<GenerateKeyResponse> {
    const user = await this.users.findOne({ id: userId });
    if (!user) throw new UnauthorizedException('User not found');

    const keyId = crypto.randomBytes(12).toString('hex');   // 24 chars
    const secret = crypto.randomBytes(24).toString('hex');  // 48 chars
    const fullKey = `sk-graphchat-${keyId}.${secret}`;

    const apiKey: ApiKey = {
      id:         uuid(),
      keyId,
      secretHash: await bcrypt.hash(secret, 12),
      userId,
      teamId:     user.teamId,
      label,
      scopes:     scopes.length ? scopes : ['read', 'write', 'analyze'],
      createdAt:  new Date().toISOString(),
    };
    await this.apiKeys.insertOne(apiKey);

    return { key: fullKey, keyId, label, createdAt: apiKey.createdAt };
  }

  async exchangeApiKey(rawKey: string): Promise<TokenResponse> {
    // Format: sk-graphchat-{keyId}.{secret}
    const match = rawKey.match(/^sk-graphchat-([a-f0-9]{24})\.([a-f0-9]{48})$/);
    if (!match) throw new UnauthorizedException('Invalid API key format');

    const [, keyId, secret] = match;
    const apiKey = await this.apiKeys.findOne({ keyId });
    if (!apiKey) throw new UnauthorizedException('API key not found');
    if (!(await bcrypt.compare(secret, apiKey.secretHash))) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Update lastUsed
    await this.apiKeys.updateOne({ keyId }, { $set: { lastUsed: new Date().toISOString() } });

    const user = await this.users.findOne({ id: apiKey.userId });
    if (!user) throw new UnauthorizedException('User not found');
    return this.issueTokens(user, apiKey.scopes);
  }

  // ── Token management ──────────────────────────────────────────────────────
  async refreshAccessToken(rawRefreshToken: string): Promise<TokenResponse> {
    const hash = this.hashToken(rawRefreshToken);
    const stored = await this.refreshTokens.findOne({ token: hash });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token invalid or expired');
    }

    const user = await this.users.findOne({ id: stored.userId });
    if (!user) throw new UnauthorizedException('User not found');

    // Rotate: delete old refresh token, issue new one
    await this.refreshTokens.deleteOne({ token: hash });
    return this.issueTokens(user);
  }

  async revokeRefreshToken(rawRefreshToken: string): Promise<void> {
    const hash = this.hashToken(rawRefreshToken);
    await this.refreshTokens.deleteOne({ token: hash });
  }

  async listApiKeys(userId: string): Promise<Omit<ApiKey, 'secretHash'>[]> {
    const keys = await this.apiKeys
      .find({ userId }, { projection: { secretHash: 0, _id: 0 } })
      .toArray();
    return keys;
  }

  async revokeApiKey(userId: string, keyId: string): Promise<void> {
    await this.apiKeys.deleteOne({ keyId, userId });
  }

  async validateJwt(payload: JwtPayload): Promise<JwtPayload> {
    return payload;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private async issueTokens(user: User, scopes?: string[]): Promise<TokenResponse> {
    const payload: JwtPayload = {
      sub:    user.id,
      teamId: user.teamId,
      scopes: scopes ?? ['read', 'write', 'analyze'],
    };

    const access_token = this.jwt.sign(payload, {
      expiresIn: this.cfg.get('JWT_EXPIRES_IN', '15m'),
    });

    const rawRefresh = crypto.randomBytes(32).toString('hex');
    const expiresAt  = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(this.cfg.get('REFRESH_TOKEN_EXPIRES_DAYS', '30')));

    await this.refreshTokens.insertOne({
      token:     this.hashToken(rawRefresh),
      userId:    user.id,
      expiresAt,
      createdAt: new Date().toISOString(),
    });

    return {
      access_token,
      refresh_token: rawRefresh,
      expires_in:    900,
      token_type:    'Bearer',
    };
  }

  private hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }
}
```

### 1e. `apps/api/src/app/auth/jwt.strategy.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { JwtPayload } from '@vectorgraph/shared-types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(cfg: ConfigService, private auth: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey:    cfg.get('JWT_SECRET'),
      ignoreExpiration: false,
    });
  }
  async validate(payload: JwtPayload) {
    return this.auth.validateJwt(payload);
  }
}
```

### 1f. `apps/api/src/app/auth/jwt.guard.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

### 1g. `apps/api/src/app/auth/auth.controller.ts`

```typescript
import { Controller, Post, Get, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';
import { ExchangeKeyDto, RefreshTokenDto, GenerateKeyDto, RegisterDto, LoginDto } from '@vectorgraph/shared-types';

@Controller('auth')
export class AuthController {
  constructor(private svc: AuthService) {}

  /** Register a new user (first-time setup) */
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.svc.register(dto);
  }

  /** Login with email + password → tokens */
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.svc.loginWithPassword(dto);
  }

  /** Exchange API key → JWT + refresh token (primary CLI flow) */
  @Post('exchange')
  exchange(@Body() dto: ExchangeKeyDto) {
    return this.svc.exchangeApiKey(dto.api_key);
  }

  /** Refresh access token */
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.svc.refreshAccessToken(dto.refresh_token);
  }

  /** Logout: revoke refresh token */
  @Post('logout')
  logout(@Body() dto: RefreshTokenDto) {
    return this.svc.revokeRefreshToken(dto.refresh_token);
  }

  /** Generate a new API key (authenticated) */
  @Post('keys')
  @UseGuards(JwtAuthGuard)
  generateKey(@Req() req: any, @Body() dto: GenerateKeyDto) {
    return this.svc.generateApiKey(req.user.sub, dto.label, dto.scopes ?? []);
  }

  /** List my API keys */
  @Get('keys')
  @UseGuards(JwtAuthGuard)
  listKeys(@Req() req: any) {
    return this.svc.listApiKeys(req.user.sub);
  }

  /** Revoke an API key */
  @Delete('keys/:keyId')
  @UseGuards(JwtAuthGuard)
  revokeKey(@Req() req: any, @Param('keyId') keyId: string) {
    return this.svc.revokeApiKey(req.user.sub, keyId);
  }
}
```

### 1h. `apps/api/src/app/auth/auth.module.ts`

```typescript
import { Module }  from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService }    from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy }    from './jwt.strategy';
import { JwtAuthGuard }   from './jwt.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject:  [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret:      cfg.get('JWT_SECRET'),
        signOptions: { expiresIn: cfg.get('JWT_EXPIRES_IN', '15m') },
      }),
    }),
  ],
  providers:   [AuthService, JwtStrategy, JwtAuthGuard],
  controllers: [AuthController],
  exports:     [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
```

### 1i. Register `AuthModule` in `app.module.ts`

```typescript
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,          // NEW — add before others
    ReposModule, NodesModule, SearchModule, AiModule, ExportModule, GraphModule,
  ],
})
export class AppModule {}
```

### 1j. Protect Existing Routes (optional but recommended)

Add `@UseGuards(JwtAuthGuard)` to all controllers that should require authentication:

```typescript
// Example: repos.controller.ts
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('repos')
@UseGuards(JwtAuthGuard)   // ADD THIS — protects all routes in this controller
export class ReposController { ... }
```

Apply the same to: `NodesController`, `SearchController`, `AiController`, `ExportController`, `GraphController`.

---

## 2. Priority 3 — CLI Tool

### 2a. Scaffold the CLI App

```bash
nx g @nx/node:app cli --directory=apps/cli
```

This generates `apps/cli/src/main.ts`. Replace everything generated inside `apps/cli/src/`.

### 2b. Install CLI Dependencies (root `package.json`)

```bash
npm install commander axios chalk ora conf inquirer open
npm install -D @types/inquirer pkg
```

- `commander` — CLI argument parsing
- `axios` — HTTP client with interceptors
- `chalk` — terminal colors
- `ora` — spinners
- `conf` — persistent config in `~/.config/graphchat/`
- `inquirer` — interactive prompts
- `open` — open browser for OAuth (future)
- `pkg` — compile to standalone binary

### 2c. File Structure

Create this exact structure under `apps/cli/src/`:

```
apps/cli/src/
├── main.ts                  Commander entry point
├── commands/
│   ├── login.ts             gph login --key sk-graphchat-...
│   ├── logout.ts            gph logout
│   ├── status.ts            gph status
│   ├── repos.ts             gph repos [list|add|delete]
│   ├── index.ts             gph index ./src
│   ├── search.ts            gph search "auth flow"
│   ├── query.ts             gph query "what calls validateToken?"
│   ├── path.ts              gph path AuthService JwtGuard
│   ├── explain.ts           gph explain AuthService
│   ├── export.ts            gph export --repo <id>
│   ├── report.ts            gph report --repo <id>
│   └── watch.ts             gph watch ./src
└── lib/
    ├── credentials.ts       ~/.graphchat/credentials (chmod 0600)
    ├── config.ts            ~/.graphchat/config.json
    ├── api-client.ts        axios with auto-refresh
    ├── output.ts            consistent pretty-print helpers
    └── token-counter.ts     rough token estimator
```

### 2d. `apps/cli/src/lib/config.ts`

```typescript
import Conf from 'conf';
import { homedir } from 'os';
import { join } from 'path';

export interface GraphchatConfig {
  serverUrl:  string;
  teamId?:    string;
  defaultRepo?: string;
}

const conf = new Conf<GraphchatConfig>({
  projectName: 'graphchat',
  defaults: {
    serverUrl: 'https://yourdomain.com',
  },
});

export const config = {
  get: <K extends keyof GraphchatConfig>(key: K): GraphchatConfig[K] => conf.get(key),
  set: <K extends keyof GraphchatConfig>(key: K, val: GraphchatConfig[K]) => conf.set(key, val),
  getAll: (): GraphchatConfig => conf.store,
  clear: () => conf.clear(),
};
```

### 2e. `apps/cli/src/lib/credentials.ts`

```typescript
import { existsSync, mkdirSync, writeFileSync, readFileSync, chmodSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const GRAPHCHAT_DIR  = join(homedir(), '.graphchat');
const CREDS_FILE  = join(GRAPHCHAT_DIR, 'credentials');

export interface Credentials {
  access_token:  string;
  refresh_token: string;
  expires_in:    number;
  server:        string;
  savedAt:       number;  // Date.now()
}

export function saveCredentials(creds: Credentials): void {
  if (!existsSync(GRAPHCHAT_DIR)) {
    mkdirSync(GRAPHCHAT_DIR, { recursive: true, mode: 0o700 });
  }
  writeFileSync(CREDS_FILE, JSON.stringify(creds, null, 2), { mode: 0o600 });
}

export function loadCredentials(): Credentials | null {
  if (!existsSync(CREDS_FILE)) return null;
  try {
    return JSON.parse(readFileSync(CREDS_FILE, 'utf8'));
  } catch {
    return null;
  }
}

export function deleteCredentials(): void {
  if (existsSync(CREDS_FILE)) {
    writeFileSync(CREDS_FILE, '', { mode: 0o600 });
  }
}

export function isTokenExpired(creds: Credentials): boolean {
  const age = (Date.now() - creds.savedAt) / 1000;
  return age >= (creds.expires_in - 60); // refresh 60s before expiry
}
```

### 2f. `apps/cli/src/lib/api-client.ts`

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';
import { loadCredentials, saveCredentials, deleteCredentials, isTokenExpired } from './credentials';
import { config } from './config';
import chalk from 'chalk';

let _client: AxiosInstance | null = null;

export function createClient(requireAuth = true): AxiosInstance {
  const creds = loadCredentials();
  const server = creds?.server ?? config.get('serverUrl');

  if (requireAuth && !creds) {
    console.error(chalk.red('Not logged in. Run: gph login --key sk-graphchat-...'));
    process.exit(1);
  }

  const client = axios.create({
    baseURL: `${server}/api`,
    headers: creds ? { Authorization: `Bearer ${creds.access_token}` } : {},
    timeout: 30_000,
  });

  // Auto-refresh interceptor
  client.interceptors.response.use(
    res => res,
    async (error: AxiosError) => {
      const original = error.config as any;
      if (error.response?.status === 401 && !original._retried && creds) {
        original._retried = true;
        try {
          const { data } = await axios.post(`${server}/api/auth/refresh`, {
            refresh_token: creds.refresh_token,
          });
          saveCredentials({ ...creds, access_token: data.access_token, savedAt: Date.now() });
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return client.request(original);
        } catch {
          deleteCredentials();
          console.error(chalk.red('Session expired. Run: gph login --key sk-graphchat-...'));
          process.exit(1);
        }
      }
      throw error;
    }
  );

  return client;
}

/** Pre-check: refresh token proactively if near expiry */
export async function ensureFreshToken(): Promise<void> {
  const creds = loadCredentials();
  if (!creds) return;
  if (isTokenExpired(creds)) {
    try {
      const { data } = await axios.post(`${creds.server}/api/auth/refresh`, {
        refresh_token: creds.refresh_token,
      });
      saveCredentials({ ...creds, access_token: data.access_token, savedAt: Date.now() });
    } catch {
      // Will be caught by interceptor on next request
    }
  }
}
```

### 2g. `apps/cli/src/lib/output.ts`

```typescript
import chalk from 'chalk';
import { NodeType, EdgeConfidence } from '@vectorgraph/shared-types';

const CONFIDENCE_COLOR: Record<EdgeConfidence, chalk.ChalkFunction> = {
  EXTRACTED:   chalk.green,
  INFERRED:    chalk.yellow,
  SPECULATIVE: chalk.gray,
};

const TYPE_ICON: Partial<Record<NodeType, string>> = {
  module:    '📦',
  api:       '🔌',
  schema:    '🗄️',
  entry:     '🚪',
  config:    '⚙️',
  note:      '📝',
  function:  '𝑓',
  class:     '🏛️',
  interface: '📐',
  rationale: '💬',
  community: '🫧',
  god_node:  '⭐',
  sql_table: '🗃️',
};

export function printNode(node: any, score?: number) {
  const icon = TYPE_ICON[node.type as NodeType] ?? '●';
  const conf = node.confidence as EdgeConfidence;
  const confStr = conf ? CONFIDENCE_COLOR[conf](`[${conf}]`) : '';
  const scoreStr = score !== undefined ? chalk.cyan(` ${(score * 100).toFixed(0)}%`) : '';
  console.log(`\n${icon} ${chalk.bold(node.label)} ${chalk.dim(`(${node.type})`)}${scoreStr} ${confStr}`);
  if (node.sourceFile) console.log(chalk.dim(`   ${node.sourceFile}:${node.sourceLine ?? ''}`));
  if (node.content) console.log(`   ${node.content.slice(0, 160)}${node.content.length > 160 ? '…' : ''}`);
  if (node.tags?.length) console.log(chalk.dim(`   #${node.tags.join(' #')}`));
}

export function printSeparator(label?: string) {
  const line = '─'.repeat(60);
  console.log(label ? chalk.dim(`${line} ${label} ${line}`) : chalk.dim(line));
}

export function printTokenEstimate(tokens: number) {
  const color = tokens < 500 ? chalk.green : tokens < 2000 ? chalk.yellow : chalk.red;
  console.log(color(`\n⚡ Token estimate: ~${tokens} tokens`));
}

export function printError(msg: string, detail?: string) {
  console.error(chalk.red(`✗ ${msg}`));
  if (detail) console.error(chalk.dim(`  ${detail}`));
}

export function printSuccess(msg: string) {
  console.log(chalk.green(`✓ ${msg}`));
}
```

### 2h. `apps/cli/src/lib/token-counter.ts`

```typescript
/** Rough token estimator — 4 chars ≈ 1 token (GPT/Claude approximation) */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateNodeTokens(node: any): number {
  const text = `${node.label} ${node.type} ${node.content} ${(node.tags ?? []).join(' ')}`;
  return estimateTokens(text);
}

export function budgetCheck(nodes: any[], budgetTokens: number): { kept: any[]; dropped: number } {
  let total = 0;
  const kept: any[] = [];
  for (const n of nodes) {
    const t = estimateNodeTokens(n);
    if (total + t > budgetTokens) break;
    total += t;
    kept.push(n);
  }
  return { kept, dropped: nodes.length - kept.length };
}
```

### 2i. `apps/cli/src/commands/login.ts`

```typescript
import { Command } from 'commander';
import axios from 'axios';
import ora from 'ora';
import chalk from 'chalk';
import { saveCredentials } from '../lib/credentials';
import { config } from '../lib/config';
import { printSuccess, printError } from '../lib/output';

export function loginCommand(): Command {
  return new Command('login')
    .description('Authenticate with your GRAPHCHAT server using an API key')
    .option('-k, --key <api_key>', 'Your GRAPHCHAT API key (sk-graphchat-...)')
    .option('-s, --server <url>', 'Server URL (default: from config)')
    .action(async (opts) => {
      const server = opts.server ?? config.get('serverUrl');

      if (!opts.key) {
        printError('API key required', 'Use: gph login --key sk-graphchat-...');
        printError('Generate a key at: ' + chalk.cyan(`${server}/dashboard/keys`));
        process.exit(1);
      }

      if (!opts.key.startsWith('sk-graphchat-')) {
        printError('Invalid key format', 'Key must start with sk-graphchat-');
        process.exit(1);
      }

      const spinner = ora('Authenticating…').start();
      try {
        const { data } = await axios.post(`${server}/api/auth/exchange`, { api_key: opts.key });
        saveCredentials({ ...data, server, savedAt: Date.now() });
        if (opts.server) config.set('serverUrl', opts.server);
        spinner.stop();
        printSuccess(`Logged in to ${chalk.cyan(server)}`);
        printSuccess(`Token expires in: ${data.expires_in}s (auto-refreshes)`);
      } catch (e: any) {
        spinner.stop();
        printError('Authentication failed', e.response?.data?.message ?? e.message);
        process.exit(1);
      }
    });
}
```

### 2j. `apps/cli/src/commands/logout.ts`

```typescript
import { Command } from 'commander';
import axios from 'axios';
import { loadCredentials, deleteCredentials } from '../lib/credentials';
import { printSuccess, printError } from '../lib/output';

export function logoutCommand(): Command {
  return new Command('logout')
    .description('Log out and revoke your session')
    .action(async () => {
      const creds = loadCredentials();
      if (!creds) { printError('Not logged in'); return; }
      try {
        await axios.post(`${creds.server}/api/auth/logout`, { refresh_token: creds.refresh_token });
      } catch { /* best effort */ }
      deleteCredentials();
      printSuccess('Logged out');
    });
}
```

### 2k. `apps/cli/src/commands/status.ts`

```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import { loadCredentials, isTokenExpired } from '../lib/credentials';
import { createClient } from '../lib/api-client';
import { config } from '../lib/config';
import { printSeparator } from '../lib/output';

export function statusCommand(): Command {
  return new Command('status')
    .description('Show connection status and indexed repositories')
    .action(async () => {
      const creds = loadCredentials();
      printSeparator('GRAPHCHAT STATUS');

      if (!creds) {
        console.log(chalk.red('● Not logged in'));
        console.log(`  Run: ${chalk.cyan('gph login --key sk-graphchat-...')}`);
        return;
      }

      console.log(chalk.green('● Connected'));
      console.log(`  Server:  ${chalk.cyan(creds.server)}`);
      console.log(`  Token:   ${isTokenExpired(creds) ? chalk.yellow('expiring soon') : chalk.green('valid')}`);

      const client = createClient();
      try {
        const { data: repos } = await client.get('/repos');
        printSeparator('REPOSITORIES');
        if (!repos.length) {
          console.log(chalk.dim('  No repositories indexed yet'));
          console.log(`  Run: ${chalk.cyan('gph index ./src --repo my-api')}`);
        } else {
          repos.forEach((r: any) => {
            console.log(`  ${chalk.bold(r.name)} ${chalk.dim(`(${r.id.slice(0, 8)}…)`)}`);
            console.log(`    Nodes: ${r.nodes?.length ?? 0} · Agent: ${r.agent} · Stack: ${r.techStack?.join(', ')}`);
          });
        }
      } catch (e: any) {
        console.log(chalk.red(`  Failed to fetch repos: ${e.message}`));
      }
    });
}
```

### 2l. `apps/cli/src/commands/repos.ts`

```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import { createClient } from '../lib/api-client';
import { printSuccess, printError, printSeparator } from '../lib/output';

export function reposCommand(): Command {
  const cmd = new Command('repos').description('Manage repositories');

  cmd.command('list')
    .description('List all indexed repositories')
    .action(async () => {
      const client = createClient();
      const { data } = await client.get('/repos');
      printSeparator('REPOSITORIES');
      if (!data.length) { console.log(chalk.dim('None')); return; }
      data.forEach((r: any) => {
        console.log(`\n${chalk.bold(r.name)} ${chalk.dim(r.id)}`);
        console.log(`  ${r.description}`);
        console.log(`  Stack: ${r.techStack?.join(', ')} · Nodes: ${r.nodes?.length ?? 0} · Agent: ${r.agent}`);
      });
    });

  cmd.command('add')
    .description('Add a new repository')
    .requiredOption('-n, --name <name>', 'Repository name')
    .requiredOption('-d, --desc <desc>', 'Description')
    .option('-s, --stack <stack>', 'Tech stack (comma-separated)', 'TypeScript')
    .option('-a, --agent <agent>', 'Primary AI agent', 'claude')
    .option('-p, --path <path>', 'Absolute repo path on server (triggers AST analysis)')
    .action(async (opts) => {
      const client = createClient();
      const { data } = await client.post('/repos', {
        name:        opts.name,
        description: opts.desc,
        techStack:   opts.stack.split(',').map((s: string) => s.trim()),
        agent:       opts.agent,
        repoPath:    opts.path,
      });
      printSuccess(`Repository created: ${data.name} (${data.id})`);
      if (opts.path) printSuccess('AST analysis triggered in background');
    });

  cmd.command('delete')
    .description('Delete a repository and all its nodes')
    .argument('<id>', 'Repository ID')
    .action(async (id) => {
      const client = createClient();
      await client.delete(`/repos/${id}`);
      printSuccess(`Repository ${id} deleted`);
    });

  return cmd;
}
```

### 2m. `apps/cli/src/commands/index.ts`

```typescript
import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { createClient } from '../lib/api-client';
import { printSuccess, printError } from '../lib/output';
import { resolve } from 'path';

export function indexCommand(): Command {
  return new Command('index')
    .description('Analyze a repository with Tree-sitter AST extraction + Leiden clustering')
    .argument('<path>', 'Path to the repository (absolute or relative)')
    .requiredOption('-r, --repo <id>', 'Repository ID to index into')
    .option('--force', 'Force full re-analysis (clears existing AST nodes)')
    .action(async (repoPath, opts) => {
      const absPath = resolve(repoPath);
      const client  = createClient();
      const spinner = ora(`Analyzing ${chalk.cyan(absPath)}…`).start();
      spinner.text = 'Running Tree-sitter AST extraction (no LLM, local only)…';

      try {
        const { data } = await client.post('/graph/analyze', {
          repoId:   opts.repo,
          repoPath: absPath,
          force:    opts.force ?? false,
        });

        spinner.stop();
        printSuccess(`Analysis complete in ${data.durationMs}ms`);
        console.log(`  Nodes added:  ${chalk.cyan(data.nodesAdded)}`);
        console.log(`  Edges added:  ${chalk.cyan(data.edgesAdded)}`);
        console.log(`  Communities:  ${chalk.cyan(data.communities)}`);
        if (data.godNodes?.length) {
          console.log(`  God nodes:    ${data.godNodes.map((g: string) => chalk.bold(g)).join(', ')}`);
        }
        console.log(chalk.dim('\n  Token cost: 0 (AST extraction uses no LLM calls)'));
      } catch (e: any) {
        spinner.stop();
        printError('Analysis failed', e.response?.data?.message ?? e.message);
        process.exit(1);
      }
    });
}
```

### 2n. `apps/cli/src/commands/search.ts`

```typescript
import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { createClient } from '../lib/api-client';
import { printNode, printSeparator, printTokenEstimate, printError } from '../lib/output';

export function searchCommand(): Command {
  return new Command('search')
    .description('Semantic vector search across all context nodes')
    .argument('<query>', 'Natural language search query')
    .option('-r, --repo <id>', 'Limit to a specific repository')
    .option('-t, --type <type>', 'Filter by node type (function, class, api, module…)')
    .option('-k, --top <n>', 'Number of results', '10')
    .option('-b, --budget <tokens>', 'Max token budget for results', '2000')
    .option('-c, --confidence <level>', 'Min confidence: EXTRACTED | INFERRED | SPECULATIVE', 'INFERRED')
    .option('--json', 'Output raw JSON')
    .option('--agent', 'Output agent-ready format (paste directly into AI chat)')
    .action(async (query, opts) => {
      const client  = createClient();
      const spinner = ora('Searching…').start();

      try {
        const { data } = await client.get('/search', {
          params: {
            q:             query,
            repoId:        opts.repo,
            type:          opts.type,
            k:             parseInt(opts.top),
            budget:        parseInt(opts.budget),
            minConfidence: opts.confidence,
          },
        });

        spinner.stop();

        if (opts.json) { console.log(JSON.stringify(data, null, 2)); return; }

        if (opts.agent) {
          // Compact format for pasting into AI chat
          console.log(`# GRAPHCHAT Search Results\nQuery: "${query}"\n`);
          data.forEach((r: any, i: number) => {
            console.log(`## [${i+1}] ${r.node.label} (${r.node.type}) — ${(r.score*100).toFixed(0)}%`);
            console.log(r.node.content);
            if (r.node.tags?.length) console.log(`Tags: ${r.node.tags.join(', ')}`);
            console.log();
          });
          return;
        }

        printSeparator(`${data.length} results for "${query}"`);
        if (!data.length) { console.log(chalk.dim('No results. Try different keywords.')); return; }

        data.forEach((r: any) => printNode(r.node, r.score));

        const total = data.reduce((acc: number, r: any) =>
          acc + Math.ceil((r.node.content?.length ?? 0) / 4), 0);
        printTokenEstimate(total);
      } catch (e: any) {
        spinner.stop();
        printError('Search failed', e.response?.data?.message ?? e.message);
      }
    });
}
```

### 2o. `apps/cli/src/commands/query.ts`

```typescript
import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { createClient } from '../lib/api-client';
import { printNode, printSeparator, printTokenEstimate, printError } from '../lib/output';

export function queryCommand(): Command {
  return new Command('query')
    .description('Graph-expanded query: vector search + call-graph traversal')
    .argument('<question>', 'Natural language question about the codebase')
    .requiredOption('-r, --repo <id>', 'Repository ID')
    .option('-m, --mode <mode>', 'Traversal mode: knn | bfs | dfs', 'knn')
    .option('-b, --budget <tokens>', 'Max token budget', '2000')
    .option('--hops <n>', 'Graph traversal depth', '2')
    .option('--json', 'Output raw JSON')
    .action(async (question, opts) => {
      const client  = createClient();
      const spinner = ora('Querying graph…').start();

      try {
        // Step 1: Vector search for seeds
        const { data: seeds } = await client.get('/search', {
          params: { q: question, repoId: opts.repo, k: 5, minConfidence: 'EXTRACTED' },
        });

        // Step 2: Graph expansion from seeds
        const seedIds = seeds.map((r: any) => r.node.id);
        const { data } = await client.post('/graph/query', {
          repoId:      opts.repo,
          query:       question,
          mode:        opts.mode,
          budget:      parseInt(opts.budget),
          hops:        parseInt(opts.hops),
          seedNodeIds: seedIds,
        });

        spinner.stop();

        if (opts.json) { console.log(JSON.stringify(data, null, 2)); return; }

        printSeparator(`Graph Query: "${question}"`);
        console.log(chalk.dim(`Mode: ${data.mode_used} · Nodes: ${data.nodes.length} · Edges: ${data.edges.length}`));

        data.nodes.forEach((n: any) => printNode(n));

        if (data.edges.length) {
          console.log(chalk.dim('\n── Relationships ──'));
          data.edges.slice(0, 10).forEach((e: any) => {
            console.log(chalk.dim(`  ${e.source} ${chalk.cyan('→')} ${e.target} [${e.type}]`));
          });
        }

        printTokenEstimate(data.token_estimate);
      } catch (e: any) {
        spinner.stop();
        printError('Query failed', e.response?.data?.message ?? e.message);
      }
    });
}
```

### 2p. `apps/cli/src/commands/path.ts`

```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import { createClient } from '../lib/api-client';
import { printError, printSeparator } from '../lib/output';

export function pathCommand(): Command {
  return new Command('path')
    .description('Find shortest path between two nodes in the graph')
    .argument('<source>', 'Source node label (e.g. AuthService)')
    .argument('<target>', 'Target node label (e.g. JwtGuard)')
    .requiredOption('-r, --repo <id>', 'Repository ID')
    .action(async (source, target, opts) => {
      const client = createClient();
      try {
        const { data } = await client.get('/graph/path', {
          params: { repoId: opts.repo, source, target },
        });
        printSeparator(`Path: ${source} → ${target}`);
        console.log(chalk.dim(`Hops: ${data.hops}`));
        console.log('\n' + data.path.map((label: string, i: number) =>
          i === 0 ? chalk.green(label) :
          i === data.path.length - 1 ? chalk.red(label) :
          chalk.cyan(label)
        ).join(chalk.dim(' → ')));
      } catch (e: any) {
        if (e.response?.status === 404) {
          printError(`No path found between "${source}" and "${target}"`);
        } else {
          printError('Path query failed', e.message);
        }
      }
    });
}
```

### 2q. `apps/cli/src/commands/explain.ts`

```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createClient } from '../lib/api-client';
import { printNode, printSeparator, printError } from '../lib/output';

export function explainCommand(): Command {
  return new Command('explain')
    .description('Plain-language explanation of a node and its relationships')
    .argument('<label>', 'Node label to explain (e.g. AuthService)')
    .requiredOption('-r, --repo <id>', 'Repository ID')
    .action(async (label, opts) => {
      const client  = createClient();
      const spinner = ora(`Explaining ${chalk.cyan(label)}…`).start();
      try {
        // Search for the specific node
        const { data: results } = await client.get('/search', {
          params: { q: label, repoId: opts.repo, k: 1 },
        });

        if (!results.length) {
          spinner.stop();
          printError(`Node "${label}" not found`);
          return;
        }

        const node = results[0].node;

        // Get graph expansion for context
        const { data: graph } = await client.post('/graph/query', {
          repoId:      opts.repo,
          query:       label,
          mode:        'bfs',
          budget:      1000,
          hops:        2,
          seedNodeIds: [node.id],
        });

        // Ask AI to explain it using graph context
        const contextStr = graph.nodes.slice(0, 6).map((n: any) =>
          `[${n.type}] ${n.label}: ${n.content?.slice(0, 80)}`
        ).join('\n');

        const { data: suggestion } = await client.post('/ai/suggest', {
          repoId: opts.repo,
          input:  `Explain this node in plain English:\n\nNode: ${node.label}\nType: ${node.type}\nContent: ${node.content}\n\nRelated nodes:\n${contextStr}`,
        });

        spinner.stop();
        printSeparator(`Explanation: ${label}`);
        printNode(node);
        console.log(chalk.bold('\n📖 Explanation:'));
        console.log(suggestion.content ?? JSON.stringify(suggestion));

        if (graph.edges.length) {
          console.log(chalk.dim('\n🔗 Connected to:'));
          graph.edges.slice(0, 8).forEach((e: any) => {
            console.log(chalk.dim(`  ${e.source} → ${e.target} [${e.type}]`));
          });
        }
      } catch (e: any) {
        spinner.stop();
        printError('Explain failed', e.message);
      }
    });
}
```

### 2r. `apps/cli/src/commands/export.ts`

```typescript
import { Command } from 'commander';
import { writeFileSync } from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import { createClient } from '../lib/api-client';
import { printSuccess, printError, printTokenEstimate } from '../lib/output';

export function exportCommand(): Command {
  return new Command('export')
    .description('Export agent-ready JSON payload for a repository')
    .requiredOption('-r, --repo <id>', 'Repository ID')
    .option('-o, --out <file>', 'Output file path (default: stdout)')
    .option('--pretty', 'Pretty-print JSON')
    .action(async (opts) => {
      const client  = createClient();
      const spinner = ora('Exporting…').start();
      try {
        const { data } = await client.get(`/export/${opts.repo}`);
        const json = opts.pretty
          ? JSON.stringify(data, null, 2)
          : JSON.stringify(data);

        spinner.stop();

        if (opts.out) {
          writeFileSync(opts.out, json, 'utf8');
          printSuccess(`Exported to ${opts.out}`);
        } else {
          console.log(json);
        }

        const tokens = Math.ceil(json.length / 4);
        printTokenEstimate(tokens);
        console.log(chalk.dim(`  Nodes: ${data.meta?.totalNodes} · Communities: ${data.meta?.communities ?? 0}`));
      } catch (e: any) {
        spinner.stop();
        printError('Export failed', e.message);
      }
    });
}
```

### 2s. `apps/cli/src/commands/report.ts`

```typescript
import { Command } from 'commander';
import { writeFileSync } from 'fs';
import chalk from 'chalk';
import { createClient } from '../lib/api-client';
import { printSuccess, printError, printTokenEstimate } from '../lib/output';

export function reportCommand(): Command {
  return new Command('report')
    .description('Fetch the GRAPH_REPORT.md for a repository (compressed context for AI agents)')
    .requiredOption('-r, --repo <id>', 'Repository ID')
    .option('-o, --out <file>', 'Save to file instead of stdout')
    .action(async (opts) => {
      const client = createClient();
      try {
        const { data } = await client.get(`/graph/report/${opts.repo}`);
        const report: string = data.report;

        if (opts.out) {
          writeFileSync(opts.out, report, 'utf8');
          printSuccess(`Saved to ${opts.out}`);
        } else {
          console.log(report);
        }

        printTokenEstimate(Math.ceil(report.length / 4));
        if (data.source) console.log(chalk.dim(`  Source: ${data.source}`));
      } catch (e: any) {
        printError('Report failed', e.message);
      }
    });
}
```

### 2t. `apps/cli/src/commands/watch.ts`

```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import { createClient } from '../lib/api-client';
import { printSuccess, printError } from '../lib/output';
import { resolve } from 'path';

export function watchCommand(): Command {
  return new Command('watch')
    .description('Watch a directory and auto-reindex changed files')
    .argument('<path>', 'Directory to watch')
    .requiredOption('-r, --repo <id>', 'Repository ID')
    .option('--debounce <ms>', 'Debounce delay in ms', '2000')
    .option('--on-commit', 'Install git hooks instead of file watching')
    .action(async (watchPath, opts) => {
      const absPath = resolve(watchPath);
      const client  = createClient();

      if (opts.onCommit) {
        // Install git hook (Priority 4)
        try {
          const { data } = await client.post('/graph/hooks/install', {
            repoId:   opts.repo,
            repoPath: absPath,
          });
          printSuccess('Git hooks installed');
          console.log(chalk.dim(`  post-commit: ${data.hookPath}`));
        } catch (e: any) {
          printError('Hook installation failed', e.message);
        }
        return;
      }

      // File watcher mode
      const { watch } = await import('chokidar');
      console.log(chalk.cyan(`👁  Watching ${absPath} (debounce: ${opts.debounce}ms)`));
      console.log(chalk.dim('  Press Ctrl+C to stop'));

      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      const changedFiles = new Set<string>();

      const watcher = watch(absPath, {
        ignoreInitial: true,
        ignored:       /(node_modules|dist|\.git|\.next)/,
      });

      watcher.on('change', (filePath) => {
        changedFiles.add(filePath);
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          console.log(chalk.dim(`\n↻ Changes detected in ${changedFiles.size} file(s). Re-indexing…`));
          changedFiles.clear();
          try {
            const { data } = await client.post('/graph/analyze', {
              repoId:   opts.repo,
              repoPath: absPath,
            });
            printSuccess(`Re-indexed: +${data.nodesAdded} nodes, ${data.communities} communities`);
          } catch (e: any) {
            printError('Re-index failed', e.message);
          }
        }, parseInt(opts.debounce));
      });

      process.on('SIGINT', () => { watcher.close(); console.log('\nWatcher stopped'); process.exit(0); });
    });
}
```

### 2u. `apps/cli/src/main.ts`

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { loginCommand }   from './commands/login';
import { logoutCommand }  from './commands/logout';
import { statusCommand }  from './commands/status';
import { reposCommand }   from './commands/repos';
import { indexCommand }   from './commands/index';
import { searchCommand }  from './commands/search';
import { queryCommand }   from './commands/query';
import { pathCommand }    from './commands/path';
import { explainCommand } from './commands/explain';
import { exportCommand }  from './commands/export';
import { reportCommand }  from './commands/report';
import { watchCommand }   from './commands/watch';

const program = new Command();

program
  .name('gph')
  .description(chalk.bold('GRAPHCHAT') + ' — Repository context graph for AI agents')
  .version('1.0.0')
  .addHelpText('after', `
${chalk.dim('Examples:')}
  ${chalk.cyan('gph login --key sk-graphchat-...')}
  ${chalk.cyan('gph index ./src --repo my-api-id')}
  ${chalk.cyan('gph search "authentication middleware" --budget 1500')}
  ${chalk.cyan('gph query "what calls validateToken?" --repo my-api-id --mode knn')}
  ${chalk.cyan('gph path AuthService JwtGuard --repo my-api-id')}
  ${chalk.cyan('gph explain AuthService --repo my-api-id')}
  ${chalk.cyan('gph report --repo my-api-id --out GRAPH_REPORT.md')}
  ${chalk.cyan('gph export --repo my-api-id --out context.json')}
  ${chalk.cyan('gph watch ./src --repo my-api-id')}
  `);

program.addCommand(loginCommand());
program.addCommand(logoutCommand());
program.addCommand(statusCommand());
program.addCommand(reposCommand());
program.addCommand(indexCommand());
program.addCommand(searchCommand());
program.addCommand(queryCommand());
program.addCommand(pathCommand());
program.addCommand(explainCommand());
program.addCommand(exportCommand());
program.addCommand(reportCommand());
program.addCommand(watchCommand());

program.parse(process.argv);
```

### 2v. `apps/cli/project.json` (NX config)

```json
{
  "name": "cli",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "apps/cli/src",
  "projectType": "application",
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/apps/cli",
        "main": "apps/cli/src/main.ts",
        "tsConfig": "apps/cli/tsconfig.app.json",
        "assets": []
      }
    },
    "build-binary": {
      "executor": "nx:run-commands",
      "options": {
        "command": "bun build apps/cli/src/main.ts --compile --outfile dist/gph-linux-x64 --target bun-linux-x64"
      },
      "dependsOn": []
    },
    "publish": {
      "executor": "nx:run-commands",
      "options": {
        "command": "cd dist/apps/cli && npm publish --access public"
      },
      "dependsOn": ["build"]
    }
  }
}
```

### 2w. `apps/cli/package.json` (for npm publishing)

```json
{
  "name": "@graphchat/cli",
  "version": "1.0.0",
  "description": "GRAPHCHAT CLI — Repository context graph for AI agents",
  "bin": {
    "gph": "./main.js"
  },
  "main": "main.js",
  "keywords": ["graphchat", "cli", "knowledge-graph", "ai-agents", "vector-search"],
  "license": "MIT"
}
```

---

## 3. Priority 4 — Advanced Graph Features

### 3a. Incremental File Watching (NestJS)

Install `chokidar` in the API:

```bash
npm install chokidar
npm install -D @types/chokidar
```

**New file: `apps/api/src/app/graph/watch.service.ts`**

```typescript
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import chokidar, { FSWatcher } from 'chokidar';
import { GraphBridgeService } from './graph-bridge.service';

interface WatchEntry {
  watcher:  FSWatcher;
  repoId:   string;
  repoPath: string;
  timer:    ReturnType<typeof setTimeout> | null;
}

@Injectable()
export class WatchService implements OnModuleDestroy {
  private watchers = new Map<string, WatchEntry>(); // repoId → entry

  constructor(private bridge: GraphBridgeService) {}

  startWatch(repoId: string, repoPath: string, debounceMs = 3000): void {
    if (this.watchers.has(repoId)) {
      this.stopWatch(repoId);
    }

    const watcher = chokidar.watch(repoPath, {
      ignoreInitial: true,
      ignored: /(node_modules|dist|\.git|\.next|__pycache__|\.graphchat)/,
      persistent: true,
    });

    const entry: WatchEntry = { watcher, repoId, repoPath, timer: null };
    this.watchers.set(repoId, entry);

    const triggerReindex = () => {
      if (entry.timer) clearTimeout(entry.timer);
      entry.timer = setTimeout(async () => {
        console.log(`[WatchService] Changes detected in repo ${repoId}, re-indexing…`);
        try {
          const result = await this.bridge.analyzeRepo({ repoId, repoPath });
          console.log(`[WatchService] Re-indexed: +${result.nodesAdded} nodes`);
        } catch (err) {
          console.error(`[WatchService] Re-index failed for ${repoId}:`, err);
        }
      }, debounceMs);
    };

    watcher.on('change', triggerReindex);
    watcher.on('add',    triggerReindex);
    watcher.on('unlink', triggerReindex);

    console.log(`[WatchService] Watching ${repoPath} for repo ${repoId}`);
  }

  stopWatch(repoId: string): void {
    const entry = this.watchers.get(repoId);
    if (entry) {
      if (entry.timer) clearTimeout(entry.timer);
      entry.watcher.close();
      this.watchers.delete(repoId);
    }
  }

  listWatched(): Array<{ repoId: string; repoPath: string }> {
    return Array.from(this.watchers.entries()).map(([repoId, e]) => ({
      repoId, repoPath: e.repoPath,
    }));
  }

  onModuleDestroy(): void {
    this.watchers.forEach((_, repoId) => this.stopWatch(repoId));
  }
}
```

**Add to `graph.module.ts`** providers and exports:

```typescript
import { WatchService } from './watch.service';

@Module({
  providers:   [CommunityCacheService, GraphBridgeService, WatchService],
  controllers: [GraphController],
  exports:     [CommunityCacheService, GraphBridgeService, WatchService],
})
export class GraphModule {}
```

**Add watch endpoints to `graph.controller.ts`:**

```typescript
import { WatchService } from './watch.service';

// Add WatchService to constructor
constructor(
  private bridge: GraphBridgeService,
  private cache:  CommunityCacheService,
  private watch:  WatchService,
) {}

@Post('watch')
startWatch(@Body() body: { repoId: string; repoPath: string; debounceMs?: number }) {
  this.watch.startWatch(body.repoId, body.repoPath, body.debounceMs);
  return { watching: true, repoId: body.repoId };
}

@Delete('watch/:repoId')
stopWatch(@Param('repoId') repoId: string) {
  this.watch.stopWatch(repoId);
  return { watching: false, repoId };
}

@Get('watch')
listWatched() {
  return this.watch.listWatched();
}
```

### 3b. Git Hook Integration (graph-service)

**New file: `graph-service/core/git_hooks.py`**

```python
"""
Installs post-commit and post-checkout git hooks that trigger
graph re-analysis on every commit or branch switch.
"""
import os
import stat
from pathlib import Path

HOOK_SCRIPT_TEMPLATE = """#!/bin/sh
# GRAPHCHAT auto-reindex hook
# Installed by: gph watch --on-commit
curl -s -X POST http://localhost:3001/api/graph/analyze \\
  -H "Content-Type: application/json" \\
  -d '{{"repoId": "{repo_id}", "repoPath": "{repo_path}"}}' \\
  -o /dev/null
echo "[GRAPHCHAT] Graph re-indexed"
"""

def install_hooks(repo_path: str, repo_id: str) -> dict:
    git_dir = Path(repo_path) / '.git'
    if not git_dir.exists():
        raise ValueError(f'No .git directory found in {repo_path}')

    hooks_dir = git_dir / 'hooks'
    hooks_dir.mkdir(exist_ok=True)

    script = HOOK_SCRIPT_TEMPLATE.format(repo_id=repo_id, repo_path=repo_path)
    installed = []

    for hook_name in ('post-commit', 'post-checkout'):
        hook_path = hooks_dir / hook_name
        existing_content = hook_path.read_text() if hook_path.exists() else ''

        if 'GRAPHCHAT' in existing_content:
            # Already installed
            installed.append(str(hook_path))
            continue

        # Append to existing hook or create new
        if hook_path.exists() and existing_content.strip():
            new_content = existing_content.rstrip('\n') + '\n\n' + script
        else:
            new_content = script

        hook_path.write_text(new_content)
        hook_path.chmod(hook_path.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
        installed.append(str(hook_path))

    return {'installed': installed, 'repo_id': repo_id, 'repo_path': repo_path}


def uninstall_hooks(repo_path: str) -> dict:
    git_dir = Path(repo_path) / '.git' / 'hooks'
    removed = []
    for hook_name in ('post-commit', 'post-checkout'):
        hook_path = git_dir / hook_name
        if hook_path.exists():
            content = hook_path.read_text()
            if 'GRAPHCHAT' in content:
                # Remove only GRAPHCHAT lines
                lines = content.split('\n')
                filtered = [l for l in lines if 'GRAPHCHAT' not in l and 'graph/analyze' not in l]
                hook_path.write_text('\n'.join(filtered))
                removed.append(str(hook_path))
    return {'removed': removed}
```

**Add endpoints to `graph-service/main.py`:**

```python
from core.git_hooks import install_hooks, uninstall_hooks

@app.post('/hooks/install')
def install_git_hooks(body: dict):
    repo_id   = body.get('repo_id')
    repo_path = body.get('repo_path')
    if not repo_id or not repo_path:
        raise HTTPException(400, 'repo_id and repo_path required')
    return install_hooks(repo_path, repo_id)

@app.delete('/hooks/uninstall')
def uninstall_git_hooks(body: dict):
    return uninstall_hooks(body.get('repo_path', ''))
```

**Add NestJS bridge method to `graph-bridge.service.ts`:**

```typescript
async installGitHooks(repoId: string, repoPath: string) {
  const { data } = await this.client.post('/hooks/install', { repo_id: repoId, repo_path: repoPath });
  return data;
}

async uninstallGitHooks(repoPath: string) {
  const { data } = await this.client.delete('/hooks/uninstall', { data: { repo_path: repoPath } });
  return data;
}
```

**Add to `graph.controller.ts`:**

```typescript
@Post('hooks/install')
installHooks(@Body() body: { repoId: string; repoPath: string }) {
  return this.bridge.installGitHooks(body.repoId, body.repoPath);
}

@Delete('hooks/uninstall')
uninstallHooks(@Body() body: { repoPath: string }) {
  return this.bridge.uninstallGitHooks(body.repoPath);
}
```

### 3c. SQL Schema AST Extraction (graph-service)

**New file: `graph-service/core/sql_extractor.py`**

```python
"""
SQL schema extraction — tables, views, functions, FK relationships.
Uses tree-sitter-sql. Zero LLM. Zero network.
All edges tagged EXTRACTED, confidence 1.0.
"""
import os
import uuid
from pathlib import Path
from datetime import datetime, timezone

try:
    import tree_sitter_sql as tssql
    from tree_sitter import Language, Parser
    SQL_LANGUAGE = Language(tssql.language())
    HAS_SQL = True
except ImportError:
    HAS_SQL = False
    print('[SQL] tree-sitter-sql not available — SQL extraction disabled')


def _now(): return datetime.now(timezone.utc).isoformat()
def _id():  return str(uuid.uuid4())


def extract_sql_file(file_path: str, repo_id: str) -> tuple[list[dict], list[dict]]:
    if not HAS_SQL:
        return [], []

    with open(file_path, 'rb') as f:
        source = f.read()

    parser = Parser(SQL_LANGUAGE)
    tree   = parser.parse(source)
    nodes, edges = [], []
    rel_path = file_path  # caller passes rel path

    def walk(node):
        # CREATE TABLE
        if node.type == 'create_table_statement':
            name_node = node.child_by_field_name('name')
            if name_node:
                name = source[name_node.start_byte:name_node.end_byte].decode().strip('"\'`[]')
                n = {
                    'id': _id(), 'repoId': repo_id, 'type': 'sql_table', 'label': name,
                    'content': f'SQL table {name}', 'tags': ['sql', 'table'],
                    'confidence': 'EXTRACTED', 'sourceFile': rel_path,
                    'sourceLine': node.start_point[0] + 1, 'updatedAt': _now(),
                }
                nodes.append(n)
                # Extract FK references
                _extract_fk(node, source, repo_id, n['id'], rel_path, edges)

        # CREATE VIEW
        elif node.type == 'create_view_statement':
            name_node = node.child_by_field_name('name')
            if name_node:
                name = source[name_node.start_byte:name_node.end_byte].decode().strip('"\'`[]')
                nodes.append({
                    'id': _id(), 'repoId': repo_id, 'type': 'module', 'label': f'{name} (view)',
                    'content': f'SQL view {name}', 'tags': ['sql', 'view'],
                    'confidence': 'EXTRACTED', 'sourceFile': rel_path,
                    'sourceLine': node.start_point[0] + 1, 'updatedAt': _now(),
                })

        for child in node.children:
            walk(child)

    walk(tree.root_node)
    return nodes, edges


def _extract_fk(table_node, source: bytes, repo_id: str,
                table_node_id: str, file_path: str, edges: list):
    """Extract FOREIGN KEY ... REFERENCES table_name edges."""
    def walk(node):
        if node.type in ('foreign_key_clause', 'references_clause'):
            for child in node.children:
                txt = source[child.start_byte:child.end_byte].decode().strip().strip('"\'`[]')
                if txt and txt.upper() not in ('REFERENCES', 'FOREIGN', 'KEY'):
                    edges.append({
                        'id': _id(), 'repoId': repo_id,
                        'sourceId': table_node_id, 'targetLabel': txt,
                        'type': 'sql_relation', 'confidence': 'EXTRACTED',
                        'weight': 1.0, 'createdAt': _now(),
                    })
                    break
        for child in node.children:
            walk(child)
    walk(table_node)


def extract_sql_dir(dir_path: str, repo_id: str) -> tuple[list[dict], list[dict]]:
    all_nodes, all_edges = [], []
    for root, dirs, files in os.walk(dir_path):
        dirs[:] = [d for d in dirs if d not in {'node_modules', 'dist', '.git'}]
        for fname in files:
            if Path(fname).suffix.lower() in ('.sql', '.psql', '.ddl'):
                abs_path = os.path.join(root, fname)
                rel_path = os.path.relpath(abs_path, dir_path)
                ns, es = extract_sql_file(rel_path, repo_id)
                all_nodes.extend(ns)
                all_edges.extend(es)
    return all_nodes, all_edges
```

Add `tree-sitter-sql` to `requirements.txt`:
```
tree-sitter-sql==0.3.8
```

**Update `graph-service/core/ast_extractor.py`** — call SQL extractor alongside code extractor:

At the bottom of `extract_repo()`, add:
```python
from .sql_extractor import extract_sql_dir

# Add after the main walk loop:
sql_nodes, sql_edges = extract_sql_dir(repo_path, repo_id)
all_nodes.extend(sql_nodes)
all_edges.extend(sql_edges)
```

### 3d. Cross-Repo Graph Merging (graph-service)

**New file: `graph-service/core/graph_merger.py`**

```python
"""
Merge two or more graph.json outputs (or MongoDB repo graphs) into one.
Cross-repo edges are tagged INFERRED with lower weight (0.6).
"""
import uuid
from datetime import datetime, timezone

import networkx as nx


def _now(): return datetime.now(timezone.utc).isoformat()


def merge_graphs(graphs: list[nx.DiGraph], repo_ids: list[str]) -> nx.DiGraph:
    """
    Merge multiple repo graphs into one cross-repo graph.
    Nodes keep their repoId. Cross-repo similarity edges are added
    between nodes with identical labels (INFERRED, weight 0.6).
    """
    merged = nx.DiGraph()

    # Add all nodes and edges
    for G in graphs:
        for node_id, data in G.nodes(data=True):
            merged.add_node(node_id, **data)
        for src, tgt, data in G.edges(data=True):
            merged.add_edge(src, tgt, **data)

    # Find cross-repo semantic bridges (same label, different repoId)
    label_to_nodes: dict[str, list[str]] = {}
    for node_id, data in merged.nodes(data=True):
        label = data.get('label', '')
        if label:
            label_to_nodes.setdefault(label, []).append(node_id)

    cross_edges_added = 0
    for label, node_ids in label_to_nodes.items():
        if len(node_ids) < 2:
            continue
        repo_groups: dict[str, list[str]] = {}
        for nid in node_ids:
            rid = merged.nodes[nid].get('repoId', '')
            repo_groups.setdefault(rid, []).append(nid)

        if len(repo_groups) > 1:
            # Connect one representative per repo
            reps = [nodes[0] for nodes in repo_groups.values()]
            for i, src in enumerate(reps):
                for tgt in reps[i+1:]:
                    if not merged.has_edge(src, tgt):
                        merged.add_edge(src, tgt,
                                        type='semantically_similar_to',
                                        confidence='INFERRED',
                                        weight=0.6)
                        cross_edges_added += 1

    print(f'[Merger] Added {cross_edges_added} cross-repo semantic edges')
    return merged
```

**Add endpoint to `graph-service/main.py`:**

```python
from core.graph_merger import merge_graphs

@app.post('/merge')
def merge_repo_graphs(body: dict):
    """Merge graphs for multiple repos into one cross-repo graph."""
    repo_ids = body.get('repo_ids', [])
    if len(repo_ids) < 2:
        raise HTTPException(400, 'At least 2 repo_ids required')

    graphs = []
    for rid in repo_ids:
        nodes = list(nodes_col.find({'repoId': rid}, {'_id': 0}))
        edges = list(edges_col.find({'repoId': rid}, {'_id': 0}))
        if nodes:
            graphs.append(build_graph(nodes, edges))

    if len(graphs) < 2:
        raise HTTPException(404, 'Not enough repos with graph data')

    merged = merge_graphs(graphs, repo_ids)
    return {
        'nodes':      merged.number_of_nodes(),
        'edges':      merged.number_of_edges(),
        'repo_ids':   repo_ids,
    }
```

**Add NestJS endpoint:**

```typescript
// graph-bridge.service.ts
async mergeGraphs(repoIds: string[]) {
  const { data } = await this.client.post('/merge', { repo_ids: repoIds });
  return data;
}

// graph.controller.ts
@Post('merge')
mergeGraphs(@Body() body: { repoIds: string[] }) {
  return this.bridge.mergeGraphs(body.repoIds);
}
```

### 3e. Wiki Export (graph-service)

**New endpoint in `graph-service/main.py`:**

```python
@app.get('/wiki/{repo_id}')
def export_wiki(repo_id: str):
    """
    Export a Markdown wiki — one article per community + one per god node.
    AI agents can navigate the wiki by reading files sequentially.
    """
    nodes = list(nodes_col.find({'repoId': repo_id}, {'_id': 0}))
    communities_list = list(communities_col.find({'repoId': repo_id}, {'_id': 0}))

    if not nodes:
        raise HTTPException(404, 'No graph data found')

    node_map = {n['id']: n for n in nodes}
    articles: dict[str, str] = {}

    # index.md — entry point
    index_lines = [
        f'# GRAPHCHAT Knowledge Wiki',
        f'Repo: {repo_id}',
        f'Generated: {datetime.utcnow().isoformat()}Z',
        f'',
        f'## Communities',
    ]

    for c in communities_list:
        slug = c['label'].lower().replace(' ', '-')
        index_lines.append(f'- [{c["label"]}](./{slug}.md) ({len(c["nodeIds"])} nodes)')
        # Community article
        god = node_map.get(c['godNodeId'], {})
        art = [
            f'# {c["label"]}',
            f'',
            f'**God node:** {god.get("label", "unknown")} ({god.get("type", "")})',
            f'**Node count:** {len(c["nodeIds"])}',
            f'',
            f'## Nodes',
            f'',
        ]
        for nid in c['nodeIds']:
            n = node_map.get(nid)
            if n:
                art += [
                    f'### {n["label"]} `{n["type"]}`',
                    n.get('content', '')[:300],
                    f'',
                    f'*Source: `{n.get("sourceFile", "")}:{n.get("sourceLine", "")}`*',
                    f'*Confidence: {n.get("confidence", "INFERRED")}*',
                    f'',
                ]
        articles[f'{slug}.md'] = '\n'.join(art)

    articles['index.md'] = '\n'.join(index_lines)

    return {'articles': articles, 'count': len(articles)}
```

**Add NestJS bridge + controller:**

```typescript
// graph-bridge.service.ts
async exportWiki(repoId: string) {
  const { data } = await this.client.get(`/wiki/${repoId}`);
  return data;
}

// graph.controller.ts
@Get('wiki/:repoId')
wiki(@Param('repoId') repoId: string) {
  return this.bridge.exportWiki(repoId);
}
```

---

## 4. Environment Variables to Add

**`.env` and `.env.prod`:**

```env
# Auth (REQUIRED — generate with: openssl rand -hex 32)
JWT_SECRET=your_64_char_random_secret_here
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_DAYS=30

# CLI distribution URL (shown in gph status)
CLI_DOWNLOAD_URL=https://yourdomain.com/downloads/gph
```

**`.env.example`:**

```env
# Auth
JWT_SECRET=generate_with_openssl_rand_hex_32
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_DAYS=30
```

---

## 5. NX Build Commands

```bash
# Add to package.json scripts:
{
  "scripts": {
    "cli:build":        "nx build cli",
    "cli:binary:linux": "bun build apps/cli/src/main.ts --compile --outfile dist/gph-linux-x64 --target bun-linux-x64",
    "cli:binary:mac":   "bun build apps/cli/src/main.ts --compile --outfile dist/gph-macos --target bun-darwin-arm64",
    "cli:publish":      "cd dist/apps/cli && npm publish --access public"
  }
}
```

---

## 6. Build Order — Follow Exactly

```
Step 1 — Auth system (required before CLI)
  1a ✎ npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
  1b ✎ libs/shared-types/src/index.ts  (append auth types — do NOT replace, only append)
  1c ✎ libs/vector-client/src/mongo.service.ts  (add 5 new collection indexes in connect())
  1d ✎ apps/api/src/app/auth/auth.service.ts  (new)
  1e ✎ apps/api/src/app/auth/jwt.strategy.ts  (new)
  1f ✎ apps/api/src/app/auth/jwt.guard.ts  (new)
  1g ✎ apps/api/src/app/auth/auth.controller.ts  (new)
  1h ✎ apps/api/src/app/auth/auth.module.ts  (new)
  1i ✎ apps/api/src/app/app.module.ts  (add AuthModule as FIRST import)
  1j ✎ Add @UseGuards(JwtAuthGuard) to all 6 controllers
  1k ✅ Verify:
       curl -X POST http://localhost:3001/api/auth/register \
         -H "Content-Type: application/json" \
         -d '{"email":"admin@test.com","password":"password123"}'
       # → returns { id, email, teamId }
       curl -X POST http://localhost:3001/api/auth/keys \
         -H "Authorization: Bearer {token_from_login}" \
         -H "Content-Type: application/json" \
         -d '{"label":"My Laptop"}'
       # → returns { key: "sk-graphchat-...", keyId, label }
       curl -X POST http://localhost:3001/api/auth/exchange \
         -d '{"api_key":"sk-graphchat-..."}'
       # → returns { access_token, refresh_token, expires_in }

Step 2 — CLI scaffold
  2a ✎ nx g @nx/node:app cli --directory=apps/cli
  2b ✎ npm install commander axios chalk ora conf inquirer open
  2c ✎ npm install -D @types/inquirer pkg
  2d ✎ apps/cli/src/lib/config.ts  (new)
  2e ✎ apps/cli/src/lib/credentials.ts  (new)
  2f ✎ apps/cli/src/lib/api-client.ts  (new)
  2g ✎ apps/cli/src/lib/output.ts  (new)
  2h ✎ apps/cli/src/lib/token-counter.ts  (new)
  2i ✎ apps/cli/src/commands/login.ts  (new)
  2j ✎ apps/cli/src/commands/logout.ts  (new)
  2k ✎ apps/cli/src/commands/status.ts  (new)
  2l ✎ apps/cli/src/commands/repos.ts  (new)
  2m ✎ apps/cli/src/commands/index.ts  (new)
  2n ✎ apps/cli/src/commands/search.ts  (new)
  2o ✎ apps/cli/src/commands/query.ts  (new)
  2p ✎ apps/cli/src/commands/path.ts  (new)
  2q ✎ apps/cli/src/commands/explain.ts  (new)
  2r ✎ apps/cli/src/commands/export.ts  (new)
  2s ✎ apps/cli/src/commands/report.ts  (new)
  2t ✎ apps/cli/src/commands/watch.ts  (new)
  2u ✎ apps/cli/src/main.ts  (replace generated file)
  2v ✎ apps/cli/project.json  (new)
  2w ✎ apps/cli/package.json  (new)
  2x ✅ Verify:
       nx build cli
       node dist/apps/cli/main.js --help
       node dist/apps/cli/main.js login --key sk-graphchat-{your_key}
       node dist/apps/cli/main.js status
       node dist/apps/cli/main.js search "authentication" --budget 500
       node dist/apps/cli/main.js query "what calls validateToken?" --repo {id} --mode knn

Step 3 — Priority 4: Advanced graph features
  3a ✎ npm install chokidar
  3b ✎ apps/api/src/app/graph/watch.service.ts  (new)
  3c ✎ apps/api/src/app/graph/graph.module.ts  (add WatchService)
  3d ✎ apps/api/src/app/graph/graph.controller.ts  (add watch + hook + merge + wiki endpoints)
  3e ✎ apps/api/src/app/graph/graph-bridge.service.ts  (add installGitHooks, mergeGraphs, exportWiki)
  3f ✎ graph-service/core/git_hooks.py  (new)
  3g ✎ graph-service/core/sql_extractor.py  (new)
  3h ✎ graph-service/core/graph_merger.py  (new)
  3i ✎ graph-service/requirements.txt  (add tree-sitter-sql==0.3.8)
  3j ✎ graph-service/core/ast_extractor.py  (add SQL extraction at bottom of extract_repo())
  3k ✎ graph-service/main.py  (add /hooks/install, /hooks/uninstall, /merge, /wiki/{repo_id})
  3l ✅ Verify:
       # Git hooks
       curl -X POST http://localhost:3001/api/graph/hooks/install \
         -H "Content-Type: application/json" \
         -d '{"repoId":"{id}","repoPath":"/path/to/repo"}'
       # File watcher
       curl -X POST http://localhost:3001/api/graph/watch \
         -H "Content-Type: application/json" \
         -d '{"repoId":"{id}","repoPath":"/path/to/repo"}'
       # Wiki
       curl http://localhost:3001/api/graph/wiki/{repo_id} | jq '.count'
       # CLI watch
       node dist/apps/cli/main.js watch ./src --repo {id}

Step 4 — Binary distribution
  4a npm run cli:build
  4b npm run cli:binary:linux   # requires bun installed on build machine
  4c ✅ ./dist/gph-linux-x64 --help
  4d ✅ ./dist/gph-linux-x64 login --key sk-graphchat-{key}
  4e ✅ ./dist/gph-linux-x64 search "auth flow" --budget 1000
```

---

## 7. Definition of Done

```
Auth
  [ ] POST /api/auth/register creates a user, returns id + teamId
  [ ] POST /api/auth/login returns access_token + refresh_token
  [ ] POST /api/auth/keys (authenticated) returns sk-graphchat-... key (shown once)
  [ ] POST /api/auth/exchange with valid key returns token pair
  [ ] POST /api/auth/refresh with valid refresh token returns new access_token
  [ ] All repo/node/search/ai/export/graph routes return 401 without JWT
  [ ] Expired refresh token returns 401 (not 500)

CLI — Core
  [ ] gph --help shows all commands
  [ ] gph login --key sk-graphchat-... saves credentials to ~/.graphchat/credentials (chmod 0600)
  [ ] gph logout revokes refresh token and deletes credentials file
  [ ] gph status shows server, token validity, and repo list
  [ ] gph repos list shows all repositories
  [ ] gph repos add --name api --desc "..." creates a repo

CLI — Graph Commands
  [ ] gph index ./src --repo {id} calls /graph/analyze and shows nodes/communities
  [ ] gph search "auth" returns ranked results with confidence badges
  [ ] gph search "auth" --budget 500 stops at ~500 tokens
  [ ] gph search "auth" --confidence EXTRACTED shows only AST-extracted nodes
  [ ] gph query "what calls validateToken?" --repo {id} shows graph-expanded results
  [ ] gph path AuthService JwtGuard --repo {id} shows path with hop count
  [ ] gph explain AuthService --repo {id} returns AI-generated explanation
  [ ] gph export --repo {id} --out context.json writes valid AgentExportPayload
  [ ] gph report --repo {id} returns GRAPH_REPORT.md content
  [ ] gph report --repo {id} --out report.md saves file
  [ ] gph watch ./src --repo {id} starts file watcher, re-indexes on change
  [ ] gph watch ./src --repo {id} --on-commit installs git hooks

CLI — Auto-refresh
  [ ] After access_token expires (15min), next command auto-refreshes silently
  [ ] After refresh_token expires (30 days), command exits with clear message

Priority 4 — Advanced features
  [ ] POST /api/graph/watch starts file watcher on server
  [ ] DELETE /api/graph/watch/{repoId} stops watcher
  [ ] GET /api/graph/watch lists all active watchers
  [ ] POST /api/graph/hooks/install writes post-commit + post-checkout hooks
  [ ] SQL .sql files are extracted with confidence=EXTRACTED, type=sql_table
  [ ] POST /api/graph/merge with 2 repo IDs returns merged graph stats
  [ ] GET /api/graph/wiki/{repoId} returns { articles: { 'index.md': '...', ... }, count }
  [ ] nx run cli:binary:linux produces a standalone executable
  [ ] Standalone binary works without Node.js installed
```

---

## 8. User Installation Instructions (for docs)

After shipping, users install the CLI with:

```bash
# Option 1: npm (requires Node.js)
npm install -g @graphchat/cli

# Option 2: standalone binary (no Node.js required)
curl -fsSL https://yourdomain.com/downloads/gph-linux-x64 -o gph
chmod +x gph && sudo mv gph /usr/local/bin/

# Option 3: bun (fastest)
bun install -g @graphchat/cli
```

Then authenticate:

```bash
gph login --key sk-graphchat-{your_key} --server https://yourdomain.com
gph status
gph index ./my-repo --repo {repo-id}
gph search "how does auth work?" --budget 2000
```
