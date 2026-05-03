import { Injectable, OnModuleInit, BadRequestException, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getEmbeddings, EmbeddingConfig } from '@vectorgraph/ai';
import { MongoVectorService, RedisVectorService } from '@vectorgraph/vector-client';
import { ContextNode, CreateRepoDto, EmbeddingProvider, GithubRepoSource, ImportGithubRepoDto, NodeType, Repository } from '@vectorgraph/shared-types';
import { v4 as uuid } from 'uuid';
import { RuntimeConfigService } from '../runtime/runtime-config.service';

type GithubApiRepo = {
  full_name: string;
  name: string;
  description: string | null;
  html_url: string;
  private: boolean;
  default_branch: string;
  language: string | null;
  topics?: string[];
  owner?: { login: string };
};

type GithubTreeEntry = {
  path: string;
  type: 'blob' | 'tree';
  size?: number;
};

type GithubTreeResponse = {
  tree?: GithubTreeEntry[];
  truncated?: boolean;
};

type GithubFileResponse = {
  path: string;
  name: string;
  type: 'file';
  encoding?: string;
  content?: string;
  size?: number;
};

type GithubApiError = {
  message?: string;
  documentation_url?: string;
};

type IngestCandidate = {
  label: string;
  sourcePath: string;
  type: NodeType;
  content: string;
  tags: string[];
};

const MAX_IMPORT_FILES = 24;
const MAX_IMPORT_NODES = 64;
const MAX_FILE_BYTES = 20_000;
const MAX_SNIPPET_CHARS = 1_400;
const MAX_FILE_CHUNKS = 4;
const CHUNK_OVERLAP_CHARS = 120;
const IGNORED_PATH_SEGMENTS = new Set([
  '.git', '.github', '.next', '.nx', '.turbo', '.yarn', 'build', 'coverage', 'dist', 'node_modules', 'out', 'target', 'tmp', 'vendor',
]);
const TEXT_FILE_EXTENSIONS = new Set([
  '.cjs', '.conf', '.css', '.env', '.example', '.go', '.graphql', '.java', '.js', '.json', '.jsx', '.md', '.mjs', '.prisma', '.py', '.rb', '.rs', '.sh', '.sql', '.toml', '.ts', '.tsx', '.txt', '.yaml', '.yml',
]);
const IMPORTANT_FILENAMES = new Set([
  'docker-compose.yml', 'docker-compose.yaml', 'dockerfile', 'makefile', 'package-lock.json', 'package.json', 'pnpm-lock.yaml', 'pyproject.toml', 'readme', 'readme.md', 'requirements.txt', 'tsconfig.json', 'yarn.lock',
]);
const INSTRUCTION_FILENAMES = new Set([
  'agents.md', 'claude.md', 'copilot-instructions.md', 'cursor.md', 'readme', 'readme.md',
]);

@Injectable()
export class ReposService implements OnModuleInit {
  private mongo: MongoVectorService;
  private redis: RedisVectorService;
  private embedCfg: EmbeddingConfig;

  constructor(private cfg: ConfigService, private runtimeConfig: RuntimeConfigService) {
    const defaultProvider = this.runtimeConfig.getDefaultEmbeddingProvider() ?? cfg.get<EmbeddingProvider>('EMBEDDING_PROVIDER', 'gemini');
    this.mongo = new MongoVectorService(cfg.get('MONGODB_URI'));
    this.redis = new RedisVectorService();
    this.embedCfg = {
      provider:      defaultProvider,
      voyageApiKey:  cfg.get('VOYAGE_API_KEY'),
      voyageBaseUrl: cfg.get('VOYAGE_BASE_URL'),
      voyageModel:   cfg.get('VOYAGE_MODEL', 'voyage-code-3') as any,
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

  findAll()                     { return this.mongo.getAllRepos(); }
  async findOne(id: string)     {
    const r = await this.mongo.getRepo(id);
    if (!r) throw new NotFoundException(`Repo ${id} not found`);
    return {
      ...r,
      nodes: await this.mongo.getNodes(id),
    };
  }
  async create(dto: CreateRepoDto): Promise<Repository> {
    const repo: Repository = {
      id: uuid(), nodes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...dto,
    };
    await this.mongo.saveRepo(repo);
    return repo;
  }

  async importGithub(dto: ImportGithubRepoDto): Promise<Repository> {
    const availableAgents = this.runtimeConfig.getAvailableAgents();
    const defaultAgent = this.runtimeConfig.getDefaultAgent(availableAgents) ?? 'all';
    const selectedAgent = dto.agent ?? defaultAgent;

    if (!availableAgents.includes(selectedAgent)) {
      throw new BadRequestException(`Agent ${selectedAgent} is not available in the current environment.`);
    }

    const parsed = this.parseGithubRepo(dto.url);
    const githubRepo = await this.fetchGithubRepo(parsed.owner, parsed.repo, dto.accessToken);
    const fullName = githubRepo.full_name ?? `${parsed.owner}/${parsed.repo}`;
    const existing = await this.mongo.findRepoByGithubFullName(fullName);
    const source: GithubRepoSource = {
      provider: 'github',
      owner: githubRepo.owner?.login ?? parsed.owner,
      repo: githubRepo.name ?? parsed.repo,
      fullName,
      url: githubRepo.html_url ?? parsed.url,
      defaultBranch: githubRepo.default_branch ?? 'main',
      isPrivate: githubRepo.private ?? false,
    };

    if (existing) {
      const existingNodes = await this.mongo.getNodes(existing.id);
      if (this.shouldReingest(existingNodes)) {
        await this.ingestGithubRepository(existing.id, githubRepo, source, dto.accessToken);
      }
      return this.findOne(existing.id);
    }

    const techStack = Array.from(new Set([
      githubRepo.language,
      ...(githubRepo.topics ?? []),
    ].filter((value): value is string => Boolean(value && value.trim()))));

    const repo: Repository = {
      id: uuid(),
      name: source.fullName,
      description: githubRepo.description ?? '',
      techStack,
      agent: selectedAgent,
      source,
      nodes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.mongo.saveRepo(repo);
    await this.ingestGithubRepository(repo.id, githubRepo, source, dto.accessToken);
    return this.findOne(repo.id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await Promise.all([
      this.mongo.deleteRepo(id),
      this.redis.deleteByRepo(id),
    ]);
  }

  private parseGithubRepo(input: string): { owner: string; repo: string; url: string } {
    const trimmed = input.trim();

    if (!trimmed) {
      throw new BadRequestException('GitHub repository URL is required');
    }

    const shortMatch = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
    if (shortMatch) {
      const [, owner, repoName] = shortMatch;
      const repo = repoName.replace(/\.git$/, '');
      return { owner, repo, url: `https://github.com/${owner}/${repo}` };
    }

    const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (sshMatch) {
      const [, owner, repoName] = sshMatch;
      return { owner, repo: repoName, url: `https://github.com/${owner}/${repoName}` };
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(trimmed);
    } catch {
      throw new BadRequestException('Use a GitHub URL, SSH URL, or owner/repo format');
    }

    if (!['github.com', 'www.github.com'].includes(parsedUrl.hostname)) {
      throw new BadRequestException('Only GitHub repositories are supported right now');
    }

    const [owner, repoSegment] = parsedUrl.pathname.split('/').filter(Boolean);
    const repo = repoSegment?.replace(/\.git$/, '');

    if (!owner || !repo) {
      throw new BadRequestException('GitHub URL must include both owner and repository name');
    }

    return { owner, repo, url: `https://github.com/${owner}/${repo}` };
  }

  private async fetchGithubRepo(owner: string, repo: string, accessToken?: string): Promise<GithubApiRepo> {
    const token = this.resolveGithubToken(accessToken);
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: this.githubHeaders(token),
    });

    const oauthScopes = response.headers.get('x-oauth-scopes')
      ?.split(',')
      .map(scope => scope.trim())
      .filter(Boolean) ?? [];
    const hasPrivateRepoScope = oauthScopes.includes('repo');
    const ssoHeader = response.headers.get('x-github-sso');
    const errorBody = await response.clone().json().catch(() => null) as GithubApiError | null;
    const githubMessage = errorBody?.message?.trim();
    const docsUrl = errorBody?.documentation_url?.trim();

    const withDocs = (message: string) => docsUrl ? `${message} GitHub docs: ${docsUrl}` : message;

    if (response.status === 401) {
      if (githubMessage) {
        throw new UnauthorizedException(withDocs(`GitHub rejected the login token: ${githubMessage}`));
      }

      throw new UnauthorizedException('GitHub login expired or the token is invalid. Sign out of GitHub in the web app and sign in again.');
    }

    if (response.status === 403) {
      if (token && !hasPrivateRepoScope) {
        throw new UnauthorizedException('Your GitHub login is missing the `repo` scope required for private repositories. Sign out and sign in again, then approve private repository access.');
      }

      if (ssoHeader) {
        throw new UnauthorizedException('GitHub organization SSO is blocking this repository. Authorize the OAuth app for that organization, then try the import again.');
      }

      if (githubMessage) {
        const normalized = githubMessage.toLowerCase();

        if (normalized.includes('saml') || normalized.includes('sso')) {
          throw new UnauthorizedException(withDocs(`GitHub organization SSO is blocking this repository: ${githubMessage}`));
        }

        if (normalized.includes('resource not accessible') || normalized.includes('not accessible by integration')) {
          throw new UnauthorizedException(withDocs(`GitHub says this account or OAuth app cannot access the repository: ${githubMessage}`));
        }

        throw new UnauthorizedException(withDocs(`GitHub denied access to this repository: ${githubMessage}`));
      }

      throw new UnauthorizedException('GitHub denied access to this repository. Sign out and sign in again, or verify that your GitHub account can read the repository.');
    }

    if (response.status === 404) {
      if (token) {
        if (githubMessage) {
          throw new NotFoundException(withDocs(`GitHub could not return this repository: ${githubMessage}`));
        }

        throw new NotFoundException('GitHub repository not found, or your current GitHub login does not have access to it. If this is an organization repository, check SSO authorization and the granted scopes.');
      }

      throw new NotFoundException('GitHub repository not found. Sign in with GitHub first if you are trying to import a private repository.');
    }

    if (!response.ok) {
      throw new BadRequestException(`GitHub lookup failed with status ${response.status}`);
    }

    return response.json() as Promise<GithubApiRepo>;
  }

  private async ingestGithubRepository(
    repoId: string,
    githubRepo: GithubApiRepo,
    source: GithubRepoSource,
    accessToken?: string,
  ): Promise<void> {
    const token = this.resolveGithubToken(accessToken);
    const files = await this.fetchGithubRepoFiles(source, token);
    const candidates = await this.buildIngestCandidates(repoId, githubRepo, source, files, token);

    if (!candidates.length) {
      throw new InternalServerErrorException('The repository was imported, but no readable source files were found to generate the graph.');
    }

    const embeddings = await getEmbeddings(candidates.map(candidate => candidate.content), this.embedCfg);
    const nodes: ContextNode[] = candidates.map((candidate, index) => ({
      id: uuid(),
      repoId,
      type: candidate.type,
      label: candidate.label,
      content: candidate.content,
      tags: candidate.tags,
      updatedAt: new Date().toISOString(),
    }));

    await Promise.all([
      this.mongo.deleteNodesByRepo(repoId),
      this.redis.deleteByRepo(repoId),
    ]);

    await Promise.all(nodes.map((node, index) => Promise.all([
      this.mongo.saveNode(node, embeddings[index]),
      this.redis.storeNode(node, embeddings[index]),
    ])));
  }

  private async fetchGithubRepoFiles(source: GithubRepoSource, token?: string): Promise<GithubTreeEntry[]> {
    const encodedRef = encodeURIComponent(source.defaultBranch);
    const response = await fetch(
      `https://api.github.com/repos/${source.owner}/${source.repo}/git/trees/${encodedRef}?recursive=1`,
      { headers: this.githubHeaders(token) }
    );

    if (!response.ok) {
      throw new BadRequestException(`Unable to read repository tree from GitHub (status ${response.status}).`);
    }

    const payload = await response.json() as GithubTreeResponse;
    return payload.tree ?? [];
  }

  private async buildIngestCandidates(
    repoId: string,
    githubRepo: GithubApiRepo,
    source: GithubRepoSource,
    files: GithubTreeEntry[],
    token?: string,
  ): Promise<IngestCandidate[]> {
    const selectedFiles = files
      .filter(file => this.shouldReadFile(file.path, file.size))
      .sort((left, right) => this.scoreFile(right.path) - this.scoreFile(left.path))
      .slice(0, MAX_IMPORT_FILES);

    const overviewNode = this.buildOverviewNode(repoId, githubRepo, source, selectedFiles);
    const fileCandidates = await Promise.all(selectedFiles.map(async (file) => {
      const rawContent = await this.fetchGithubFileContent(source, file.path, token);
      if (!rawContent?.trim()) return [];

      const type = this.inferNodeType(file.path);
      return this.buildFileCandidates(file.path, type, rawContent);
    }));

    return [overviewNode, ...fileCandidates.flat().slice(0, MAX_IMPORT_NODES - 1)];
  }

  private buildOverviewNode(
    repoId: string,
    githubRepo: GithubApiRepo,
    source: GithubRepoSource,
    files: GithubTreeEntry[],
  ): IngestCandidate {
    const typeCounts = files.reduce<Record<NodeType, number>>((counts, file) => {
      const type = this.inferNodeType(file.path);
      counts[type] = (counts[type] ?? 0) + 1;
      return counts;
    }, { module: 0, api: 0, schema: 0, entry: 0, config: 0, note: 0 });

    const topPaths = files.slice(0, 12).map(file => `- ${file.path}`).join('\n');
    const content = [
      `Repository: ${source.fullName}`,
      githubRepo.description ? `Description: ${githubRepo.description}` : '',
      `Default branch: ${source.defaultBranch}`,
      `Detected stack: ${[githubRepo.language, ...(githubRepo.topics ?? [])].filter(Boolean).join(', ') || 'unknown'}`,
      `Node counts: module=${typeCounts.module}, api=${typeCounts.api}, schema=${typeCounts.schema}, entry=${typeCounts.entry}, config=${typeCounts.config}, note=${typeCounts.note}`,
      'Priority files:',
      topPaths,
    ].filter(Boolean).join('\n');

    return {
      label: `${source.fullName} overview`,
      sourcePath: `${source.fullName} overview`,
      type: 'note',
      content,
      tags: ['github', 'overview', 'repo', source.owner, source.repo],
    };
  }

  private buildFileCandidates(filePath: string, type: NodeType, rawContent: string): IngestCandidate[] {
    const chunks = this.chunkContent(rawContent).slice(0, MAX_FILE_CHUNKS);
    const isInstruction = this.isInstructionFile(filePath);

    return chunks.map((chunk, index) => ({
      label: chunks.length === 1 ? filePath : `${filePath}#${index + 1}`,
      sourcePath: filePath,
      type,
      content: this.buildNodeContent(filePath, type, chunk, index + 1, chunks.length),
      tags: this.buildTags(filePath, type, isInstruction),
    }));
  }

  private async fetchGithubFileContent(source: GithubRepoSource, filePath: string, token?: string): Promise<string | null> {
    const encodedPath = filePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
    const encodedRef = encodeURIComponent(source.defaultBranch);
    const response = await fetch(
      `https://api.github.com/repos/${source.owner}/${source.repo}/contents/${encodedPath}?ref=${encodedRef}`,
      { headers: this.githubHeaders(token) }
    );

    if (!response.ok) {
      return null;
    }

    const payload = await response.json() as GithubFileResponse;
    if (payload.type !== 'file' || payload.encoding !== 'base64' || !payload.content) {
      return null;
    }

    const content = Buffer.from(payload.content, 'base64').toString('utf8');
    if (content.includes('\u0000')) {
      return null;
    }

    return content.slice(0, MAX_SNIPPET_CHARS);
  }

  private shouldReadFile(filePath: string, size?: number): boolean {
    const segments = filePath.toLowerCase().split('/');
    if (segments.some(segment => IGNORED_PATH_SEGMENTS.has(segment))) {
      return false;
    }

    if (size && size > MAX_FILE_BYTES) {
      return false;
    }

    const fileName = segments[segments.length - 1];
    const ext = this.getExtension(fileName);

    return IMPORTANT_FILENAMES.has(fileName) || INSTRUCTION_FILENAMES.has(fileName) || TEXT_FILE_EXTENSIONS.has(ext);
  }

  private scoreFile(filePath: string): number {
    const normalized = filePath.toLowerCase();
    const fileName = normalized.split('/').pop() ?? normalized;
    let score = 0;

    if (INSTRUCTION_FILENAMES.has(fileName)) score += 120;
    if (normalized === 'readme.md') score += 100;
    if (normalized.endsWith('package.json')) score += 90;
    if (normalized.includes('/src/')) score += 30;
    if (normalized.includes('/api/') || normalized.includes('/routes/')) score += 25;
    if (normalized.includes('/schema') || normalized.endsWith('.sql') || normalized.endsWith('.prisma')) score += 20;
    if (normalized.includes('/config') || normalized.endsWith('.yml') || normalized.endsWith('.yaml') || normalized.endsWith('.json')) score += 15;
    if (normalized.includes('main.') || normalized.endsWith('/index.ts') || normalized.endsWith('/index.js')) score += 15;
    if (normalized.includes('test') || normalized.includes('__tests__')) score -= 40;
    if (normalized.includes('fixture') || normalized.includes('mock')) score -= 25;

    return score;
  }

  private inferNodeType(filePath: string): NodeType {
    const normalized = filePath.toLowerCase();

    if (this.isInstructionFile(filePath) || normalized === 'readme.md' || normalized.endsWith('.md')) return 'note';
    if (normalized.includes('docker') || normalized.includes('config') || normalized.endsWith('.json') || normalized.endsWith('.yaml') || normalized.endsWith('.yml') || normalized.endsWith('.toml') || normalized.endsWith('.env') || normalized.endsWith('.env.example')) return 'config';
    if (normalized.includes('schema') || normalized.endsWith('.sql') || normalized.endsWith('.prisma') || normalized.includes('/migrations/')) return 'schema';
    if (normalized.includes('/api/') || normalized.includes('/routes/') || normalized.includes('/controllers/') || normalized.includes('/controller.') || normalized.includes('/route.')) return 'api';
    if (normalized.endsWith('/index.ts') || normalized.endsWith('/index.js') || normalized.includes('main.') || normalized.includes('app.') || normalized.includes('server.') || normalized.includes('cli.')) return 'entry';
    return 'module';
  }

  private buildNodeContent(filePath: string, type: NodeType, rawContent: string, chunkIndex: number, totalChunks: number): string {
    const symbols = this.extractSymbols(rawContent).slice(0, 8);
    const snippet = rawContent.trim().slice(0, MAX_SNIPPET_CHARS);
    return [
      `Path: ${filePath}`,
      `Type: ${type}`,
      totalChunks > 1 ? `Chunk: ${chunkIndex}/${totalChunks}` : '',
      symbols.length ? `Symbols: ${symbols.join(', ')}` : '',
      'Snippet:',
      snippet,
    ].filter(Boolean).join('\n');
  }

  private extractSymbols(content: string): string[] {
    const matches = content.matchAll(/(?:export\s+)?(?:async\s+)?(?:function|class|interface|type|const|let)\s+([A-Za-z0-9_]+)/g);
    return Array.from(matches, match => match[1]);
  }

  private buildTags(filePath: string, type: NodeType, isInstruction = false): string[] {
    const segments = filePath.split('/').filter(Boolean);
    const fileName = segments[segments.length - 1] ?? filePath;
    const ext = this.getExtension(fileName).replace('.', '');
    return Array.from(new Set([
      type,
      isInstruction ? 'instruction' : undefined,
      ext || undefined,
      fileName,
      segments[0],
      segments[1],
    ].filter((value): value is string => Boolean(value))));
  }

  private chunkContent(content: string): string[] {
    const normalized = content.replace(/\r\n/g, '\n').trim();
    if (!normalized) return [];
    if (normalized.length <= MAX_SNIPPET_CHARS) return [normalized];

    const chunks: string[] = [];
    let start = 0;

    while (start < normalized.length && chunks.length < MAX_FILE_CHUNKS) {
      let end = Math.min(start + MAX_SNIPPET_CHARS, normalized.length);
      if (end < normalized.length) {
        const boundary = normalized.lastIndexOf('\n', end);
        if (boundary > start + Math.floor(MAX_SNIPPET_CHARS * 0.6)) {
          end = boundary;
        }
      }

      chunks.push(normalized.slice(start, end).trim());
      if (end >= normalized.length) break;
      start = Math.max(end - CHUNK_OVERLAP_CHARS, start + 1);
    }

    return chunks.filter(Boolean);
  }

  private isInstructionFile(filePath: string): boolean {
    const fileName = filePath.toLowerCase().split('/').pop() ?? filePath.toLowerCase();
    return INSTRUCTION_FILENAMES.has(fileName);
  }

  private shouldReingest(nodes: ContextNode[]): boolean {
    if (nodes.length === 0) return true;
    return nodes.every(node => node.label.toLowerCase().endsWith(' overview'));
  }

  private getExtension(fileName: string): string {
    const index = fileName.lastIndexOf('.');
    return index >= 0 ? fileName.slice(index).toLowerCase() : '';
  }

  private resolveGithubToken(accessToken?: string): string | undefined {
    return accessToken?.trim() || this.cfg.get<string>('GITHUB_TOKEN')?.trim();
  }

  private githubHeaders(token?: string): HeadersInit {
    return {
      Accept: 'application/vnd.github+json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }
}
