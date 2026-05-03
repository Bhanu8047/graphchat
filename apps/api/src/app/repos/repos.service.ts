import {
  Injectable,
  OnModuleInit,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getEmbeddings, EmbeddingConfig } from '@vectorgraph/ai';
import {
  MongoVectorService,
  RedisVectorService,
} from '@vectorgraph/vector-client';
import {
  ContextNode,
  CreateRepoDto,
  EmbeddingProvider,
  GithubBranchListResponse,
  GithubRepoSource,
  GraphEdge,
  GraphNode,
  GraphSyncDto,
  ImportGithubRepoDto,
  NodeType,
  Repository,
  RepositorySyncState,
} from '@vectorgraph/shared-types';
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
  sha?: string;
  size?: number;
};

type GithubTreeResponse = {
  tree?: GithubTreeEntry[];
  truncated?: boolean;
};

type GithubBranchResponse = {
  name: string;
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
  fileDigest?: string;
  type: NodeType;
  content: string;
  tags: string[];
  chunkIndex?: number;
  totalChunks?: number;
};

type SelectedGithubFile = GithubTreeEntry & { sha: string };

const MAX_IMPORT_FILES = 24;
const MAX_IMPORT_NODES = 64;
const MAX_FILE_BYTES = 20_000;
const MAX_SNIPPET_CHARS = 1_400;
const MAX_FILE_CHUNKS = 4;
const CHUNK_OVERLAP_CHARS = 120;
const IGNORED_PATH_SEGMENTS = new Set([
  '.git',
  '.github',
  '.next',
  '.nx',
  '.turbo',
  '.yarn',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'out',
  'target',
  'tmp',
  'vendor',
]);
const TEXT_FILE_EXTENSIONS = new Set([
  '.cjs',
  '.conf',
  '.css',
  '.env',
  '.example',
  '.go',
  '.graphql',
  '.java',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.prisma',
  '.py',
  '.rb',
  '.rs',
  '.sh',
  '.sql',
  '.toml',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);
const IMPORTANT_FILENAMES = new Set([
  'docker-compose.yml',
  'docker-compose.yaml',
  'dockerfile',
  'makefile',
  'package-lock.json',
  'package.json',
  'pnpm-lock.yaml',
  'pyproject.toml',
  'readme',
  'readme.md',
  'requirements.txt',
  'tsconfig.json',
  'yarn.lock',
]);
const INSTRUCTION_FILENAMES = new Set([
  'agents.md',
  'claude.md',
  'copilot-instructions.md',
  'cursor.md',
  'readme',
  'readme.md',
]);
const OVERVIEW_SOURCE_PATH = '__repo_overview__';

@Injectable()
export class ReposService implements OnModuleInit {
  private mongo: MongoVectorService;
  private redis: RedisVectorService;
  private embedCfg: EmbeddingConfig;

  constructor(
    private cfg: ConfigService,
    private runtimeConfig: RuntimeConfigService,
  ) {
    const defaultProvider =
      this.runtimeConfig.getDefaultEmbeddingProvider() ??
      cfg.get<EmbeddingProvider>('EMBEDDING_PROVIDER', 'gemini');
    this.mongo = new MongoVectorService(cfg.get('MONGODB_URI'));
    this.redis = new RedisVectorService();
    this.embedCfg = {
      provider: defaultProvider,
      voyageApiKey: cfg.get('VOYAGE_API_KEY'),
      voyageBaseUrl: cfg.get('VOYAGE_BASE_URL'),
      voyageModel: cfg.get('VOYAGE_MODEL', 'voyage-code-3') as any,
      openaiApiKey: cfg.get('OPENAI_API_KEY'),
      geminiApiKey: cfg.get('GEMINI_API_KEY'),
      ollamaBaseUrl: cfg.get('OLLAMA_BASE_URL'),
      ollamaEmbedModel: cfg.get('OLLAMA_EMBED_MODEL'),
    };
  }
  async onModuleInit() {
    await this.mongo.connect();
    await this.redis.connect();
  }

  findAll(ownerId: string) {
    return this.mongo.getAllReposForOwner(ownerId);
  }
  async findOne(id: string, ownerId: string) {
    const r = await this.mongo.getRepoForOwner(id, ownerId);
    if (!r) throw new NotFoundException(`Repo ${id} not found`);
    return {
      ...r,
      nodes: await this.mongo.getNodesForOwner(id, ownerId),
    };
  }
  async create(dto: CreateRepoDto, ownerId: string): Promise<Repository> {
    const repo: Repository = {
      id: uuid(),
      ownerId,
      nodes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...dto,
    };
    await this.mongo.saveRepo(repo);
    return repo;
  }

  async listGithubBranches(
    input: string,
    accessToken?: string,
  ): Promise<GithubBranchListResponse> {
    const parsed = this.parseGithubRepo(input);
    const githubRepo = await this.fetchGithubRepo(
      parsed.owner,
      parsed.repo,
      accessToken,
    );
    const branches = await this.fetchGithubBranches(
      parsed.owner,
      parsed.repo,
      accessToken,
    );
    const defaultBranch = githubRepo.default_branch ?? branches[0] ?? 'main';

    return {
      fullName: githubRepo.full_name ?? `${parsed.owner}/${parsed.repo}`,
      defaultBranch,
      branches: Array.from(new Set([defaultBranch, ...branches])),
    };
  }

  async importGithub(
    dto: ImportGithubRepoDto,
    ownerId: string,
  ): Promise<Repository> {
    const availableAgents = this.runtimeConfig.getAvailableAgents();
    const defaultAgent =
      this.runtimeConfig.getDefaultAgent(availableAgents) ?? 'all';
    const selectedAgent = dto.agent ?? defaultAgent;

    if (!availableAgents.includes(selectedAgent)) {
      throw new BadRequestException(
        `Agent ${selectedAgent} is not available in the current environment.`,
      );
    }

    const parsed = this.parseGithubRepo(dto.url);
    const githubRepo = await this.fetchGithubRepo(
      parsed.owner,
      parsed.repo,
      dto.accessToken,
    );
    const fullName = githubRepo.full_name ?? `${parsed.owner}/${parsed.repo}`;
    const selectedBranch =
      dto.branch?.trim() || githubRepo.default_branch || 'main';
    const existing = await this.mongo.findRepoByGithubFullNameAndBranchForOwner(
      fullName,
      selectedBranch,
      ownerId,
    );
    const source: GithubRepoSource = {
      provider: 'github',
      owner: githubRepo.owner?.login ?? parsed.owner,
      repo: githubRepo.name ?? parsed.repo,
      fullName,
      url: githubRepo.html_url ?? parsed.url,
      branch: selectedBranch,
      defaultBranch: githubRepo.default_branch ?? 'main',
      isPrivate: githubRepo.private ?? false,
    };

    if (existing) {
      return this.syncGithub(
        existing.id,
        { accessToken: dto.accessToken },
        ownerId,
      );
    }

    const seedRepo = await this.findSeedRepo(fullName, selectedBranch, ownerId);

    const techStack = Array.from(
      new Set(
        [githubRepo.language, ...(githubRepo.topics ?? [])].filter(
          (value): value is string => Boolean(value && value.trim()),
        ),
      ),
    );

    const repo: Repository = {
      id: uuid(),
      ownerId,
      name: this.formatGithubGraphName(source),
      description: githubRepo.description ?? '',
      techStack,
      agent: selectedAgent,
      source,
      nodes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.mongo.saveRepo(repo);
    return this.syncGithub(
      repo.id,
      { accessToken: dto.accessToken, force: true, seedRepoId: seedRepo?.id },
      ownerId,
    );
  }

  async syncGithub(
    repoId: string,
    dto: GraphSyncDto = {},
    ownerId: string,
  ): Promise<Repository> {
    const repo = await this.findOne(repoId, ownerId);
    if (!repo.source || repo.source.provider !== 'github') {
      throw new BadRequestException(
        'Only GitHub-backed repositories support automatic graph sync.',
      );
    }

    const source = {
      ...repo.source,
      branch: repo.source.branch ?? repo.source.defaultBranch,
    };
    const githubRepo = await this.fetchGithubRepo(
      source.owner,
      source.repo,
      dto.accessToken,
    );
    const files = await this.fetchGithubRepoFiles(
      source,
      this.resolveGithubToken(dto.accessToken),
    );
    const selectedFiles = this.selectGithubFiles(files);

    if (!selectedFiles.length) {
      throw new InternalServerErrorException(
        'The repository tree is readable, but no supported source files were selected for graph sync.',
      );
    }

    const previousDigests = await this.mongo.getGraphFileDigests(repoId);
    const seedRepo =
      Object.keys(previousDigests).length === 0 && dto.seedRepoId
        ? await this.mongo.getRepoForOwner(dto.seedRepoId, ownerId)
        : null;
    const seedDigests = seedRepo
      ? await this.mongo.getGraphFileDigests(seedRepo.id)
      : {};
    const baselineDigests =
      Object.keys(previousDigests).length > 0 ? previousDigests : seedDigests;
    const currentDigests = Object.fromEntries(
      selectedFiles.map((file) => [file.path, file.sha]),
    );
    const requiresFullReingest = dto.force || this.shouldReingest(repo.nodes);
    const removedPaths = Object.keys(previousDigests).filter(
      (path) => !(path in currentDigests),
    );
    const changedPaths = requiresFullReingest
      ? selectedFiles.map((file) => file.path)
      : selectedFiles
          .filter((file) => baselineDigests[file.path] !== file.sha)
          .map((file) => file.path);
    const shouldRefreshOverview =
      requiresFullReingest ||
      changedPaths.length > 0 ||
      removedPaths.length > 0;

    const changedFiles = selectedFiles.filter((file) =>
      changedPaths.includes(file.path),
    );
    const changedCandidates = await this.buildChangedCandidates(
      repoId,
      githubRepo,
      source,
      changedFiles,
      dto.accessToken,
      shouldRefreshOverview,
    );
    const reusedPaths =
      Object.keys(previousDigests).length === 0 && seedRepo
        ? selectedFiles
            .filter(
              (file) =>
                !changedPaths.includes(file.path) &&
                seedDigests[file.path] === file.sha,
            )
            .map((file) => file.path)
        : [];

    const staleSourcePaths = Array.from(
      new Set([
        ...removedPaths,
        ...changedPaths,
        ...(shouldRefreshOverview ? [OVERVIEW_SOURCE_PATH] : []),
      ]),
    );
    const staleNodes = await this.mongo.getNodesBySourcePaths(
      repoId,
      staleSourcePaths,
    );

    await Promise.all([
      this.mongo.deleteNodesBySourcePaths(repoId, staleSourcePaths),
      ...staleNodes.map((node) => this.redis.deleteNode(node.id)),
    ]);

    if (seedRepo && reusedPaths.length) {
      const reusedNodes = await this.mongo.getStoredNodesBySourcePaths(
        seedRepo.id,
        reusedPaths,
      );
      await Promise.all(
        reusedNodes.map((node) => {
          const clonedNode: ContextNode = {
            id: uuid(),
            ownerId,
            repoId,
            type: node.type,
            label: node.label,
            content: node.content,
            tags: node.tags,
            sourcePath: node.sourcePath,
            fileDigest: node.fileDigest,
            chunkIndex: node.chunkIndex,
            totalChunks: node.totalChunks,
            updatedAt: new Date().toISOString(),
          };

          return Promise.all([
            this.mongo.saveNode(clonedNode, node.embedding),
            this.redis.storeNode(clonedNode, node.embedding),
          ]);
        }),
      );
    }

    if (changedCandidates.length) {
      const embeddings = await getEmbeddings(
        changedCandidates.map((candidate) => candidate.content),
        this.embedCfg,
      );
      await Promise.all(
        changedCandidates.map((candidate, index) => {
          const node: ContextNode = {
            id: uuid(),
            ownerId,
            repoId,
            type: candidate.type,
            label: candidate.label,
            content: candidate.content,
            tags: candidate.tags,
            sourcePath: candidate.sourcePath,
            fileDigest: candidate.fileDigest,
            chunkIndex: candidate.chunkIndex,
            totalChunks: candidate.totalChunks,
            updatedAt: new Date().toISOString(),
          };

          return Promise.all([
            this.mongo.saveNode(node, embeddings[index]),
            this.redis.storeNode(node, embeddings[index]),
          ]);
        }),
      );
    }

    const contextNodes = await this.mongo.getNodesForOwner(repoId, ownerId);
    const graph = this.buildGraph(
      repoId,
      ownerId,
      source,
      selectedFiles,
      contextNodes,
    );
    await this.mongo.replaceGraph(repoId, graph.nodes, graph.edges);

    const sync: RepositorySyncState = {
      strategy: 'github-tree-sha-diff',
      autoUpdate: true,
      lastSyncedAt: new Date().toISOString(),
      lastSourceRef: source.branch,
      lastSyncStatus: 'idle',
      fileCount: selectedFiles.length,
      nodeCount: contextNodes.length,
      edgeCount: graph.edges.length,
      reusedPaths: reusedPaths.length,
      seededFromRepoId: seedRepo?.id,
      changedPaths: Array.from(
        new Set([...changedPaths, ...removedPaths]),
      ).slice(0, 50),
    };

    const updatedRepo: Repository = {
      ...repo,
      name: this.formatGithubGraphName({
        fullName: githubRepo.full_name ?? source.fullName,
        branch: source.branch,
      }),
      description: githubRepo.description ?? repo.description,
      techStack: Array.from(
        new Set(
          [
            githubRepo.language,
            ...(githubRepo.topics ?? []),
            ...repo.techStack,
          ].filter((value): value is string => Boolean(value && value.trim())),
        ),
      ),
      source: {
        ...source,
        owner: githubRepo.owner?.login ?? source.owner,
        repo: githubRepo.name ?? source.repo,
        fullName: githubRepo.full_name ?? source.fullName,
        url: githubRepo.html_url ?? source.url,
        branch: source.branch,
        defaultBranch: githubRepo.default_branch ?? source.defaultBranch,
        isPrivate: githubRepo.private ?? source.isPrivate,
      },
      sync,
      updatedAt: new Date().toISOString(),
      nodes: contextNodes,
    };

    await this.mongo.saveRepo(updatedRepo);
    return this.findOne(repoId, ownerId);
  }

  async remove(id: string, ownerId: string) {
    await this.findOne(id, ownerId);
    await Promise.all([this.mongo.deleteRepo(id), this.redis.deleteByRepo(id)]);
  }

  private async findSeedRepo(
    fullName: string,
    branch: string,
    ownerId: string,
  ): Promise<Repository | null> {
    const candidates = await this.mongo.findReposByGithubFullNameForOwner(
      fullName,
      ownerId,
    );
    return (
      candidates.find(
        (candidate) =>
          candidate.source?.provider === 'github' &&
          candidate.source.branch !== branch,
      ) ?? null
    );
  }

  private formatGithubGraphName(
    source: Pick<GithubRepoSource, 'fullName' | 'branch'>,
  ): string {
    return `${source.fullName}@${source.branch}`;
  }

  private parseGithubRepo(input: string): {
    owner: string;
    repo: string;
    url: string;
  } {
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

    const sshMatch = trimmed.match(
      /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/,
    );
    if (sshMatch) {
      const [, owner, repoName] = sshMatch;
      return {
        owner,
        repo: repoName,
        url: `https://github.com/${owner}/${repoName}`,
      };
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(trimmed);
    } catch {
      throw new BadRequestException(
        'Use a GitHub URL, SSH URL, or owner/repo format',
      );
    }

    if (!['github.com', 'www.github.com'].includes(parsedUrl.hostname)) {
      throw new BadRequestException(
        'Only GitHub repositories are supported right now',
      );
    }

    const [owner, repoSegment] = parsedUrl.pathname.split('/').filter(Boolean);
    const repo = repoSegment?.replace(/\.git$/, '');

    if (!owner || !repo) {
      throw new BadRequestException(
        'GitHub URL must include both owner and repository name',
      );
    }

    return { owner, repo, url: `https://github.com/${owner}/${repo}` };
  }

  private async fetchGithubRepo(
    owner: string,
    repo: string,
    accessToken?: string,
  ): Promise<GithubApiRepo> {
    const token = this.resolveGithubToken(accessToken);
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: this.githubHeaders(token),
      },
    );

    const oauthScopes =
      response.headers
        .get('x-oauth-scopes')
        ?.split(',')
        .map((scope) => scope.trim())
        .filter(Boolean) ?? [];
    const hasPrivateRepoScope = oauthScopes.includes('repo');
    const ssoHeader = response.headers.get('x-github-sso');
    const errorBody = (await response
      .clone()
      .json()
      .catch(() => null)) as GithubApiError | null;
    const githubMessage = errorBody?.message?.trim();
    const docsUrl = errorBody?.documentation_url?.trim();

    const withDocs = (message: string) =>
      docsUrl ? `${message} GitHub docs: ${docsUrl}` : message;

    if (response.status === 401) {
      if (githubMessage) {
        throw new UnauthorizedException(
          withDocs(`GitHub rejected the login token: ${githubMessage}`),
        );
      }

      throw new UnauthorizedException(
        'GitHub login expired or the token is invalid. Sign out of GitHub in the web app and sign in again.',
      );
    }

    if (response.status === 403) {
      if (token && !hasPrivateRepoScope) {
        throw new UnauthorizedException(
          'Your GitHub login is missing the `repo` scope required for private repositories. Sign out and sign in again, then approve private repository access.',
        );
      }

      if (ssoHeader) {
        throw new UnauthorizedException(
          'GitHub organization SSO is blocking this repository. Authorize the OAuth app for that organization, then try the import again.',
        );
      }

      if (githubMessage) {
        const normalized = githubMessage.toLowerCase();

        if (normalized.includes('saml') || normalized.includes('sso')) {
          throw new UnauthorizedException(
            withDocs(
              `GitHub organization SSO is blocking this repository: ${githubMessage}`,
            ),
          );
        }

        if (
          normalized.includes('resource not accessible') ||
          normalized.includes('not accessible by integration')
        ) {
          throw new UnauthorizedException(
            withDocs(
              `GitHub says this account or OAuth app cannot access the repository: ${githubMessage}`,
            ),
          );
        }

        throw new UnauthorizedException(
          withDocs(`GitHub denied access to this repository: ${githubMessage}`),
        );
      }

      throw new UnauthorizedException(
        'GitHub denied access to this repository. Sign out and sign in again, or verify that your GitHub account can read the repository.',
      );
    }

    if (response.status === 404) {
      if (token) {
        if (githubMessage) {
          throw new NotFoundException(
            withDocs(
              `GitHub could not return this repository: ${githubMessage}`,
            ),
          );
        }

        throw new NotFoundException(
          'GitHub repository not found, or your current GitHub login does not have access to it. If this is an organization repository, check SSO authorization and the granted scopes.',
        );
      }

      throw new NotFoundException(
        'GitHub repository not found. Sign in with GitHub first if you are trying to import a private repository.',
      );
    }

    if (!response.ok) {
      throw new BadRequestException(
        `GitHub lookup failed with status ${response.status}`,
      );
    }

    return response.json() as Promise<GithubApiRepo>;
  }

  private async fetchGithubRepoFiles(
    source: GithubRepoSource,
    token?: string,
  ): Promise<GithubTreeEntry[]> {
    const encodedRef = encodeURIComponent(source.branch);
    const response = await fetch(
      `https://api.github.com/repos/${source.owner}/${source.repo}/git/trees/${encodedRef}?recursive=1`,
      { headers: this.githubHeaders(token) },
    );

    if (!response.ok) {
      throw new BadRequestException(
        `Unable to read repository tree from GitHub (status ${response.status}).`,
      );
    }

    const payload = (await response.json()) as GithubTreeResponse;
    return payload.tree ?? [];
  }

  private async fetchGithubBranches(
    owner: string,
    repo: string,
    accessToken?: string,
  ): Promise<string[]> {
    const token = this.resolveGithubToken(accessToken);
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`,
      {
        headers: this.githubHeaders(token),
      },
    );

    if (!response.ok) {
      throw new BadRequestException(
        `Unable to list repository branches from GitHub (status ${response.status}).`,
      );
    }

    const payload = (await response.json()) as GithubBranchResponse[];
    return payload.map((branch) => branch.name).filter(Boolean);
  }

  private selectGithubFiles(files: GithubTreeEntry[]): SelectedGithubFile[] {
    return files
      .filter(
        (file): file is SelectedGithubFile =>
          file.type === 'blob' &&
          Boolean(file.sha) &&
          this.shouldReadFile(file.path, file.size),
      )
      .sort(
        (left, right) => this.scoreFile(right.path) - this.scoreFile(left.path),
      )
      .slice(0, MAX_IMPORT_FILES);
  }

  private async buildChangedCandidates(
    repoId: string,
    githubRepo: GithubApiRepo,
    source: GithubRepoSource,
    files: SelectedGithubFile[],
    accessToken: string | undefined,
    includeOverview: boolean,
  ): Promise<IngestCandidate[]> {
    const overviewNode = includeOverview
      ? [this.buildOverviewNode(repoId, githubRepo, source, files)]
      : [];
    const fileCandidates = await Promise.all(
      files.map(async (file) => {
        const rawContent = await this.fetchGithubFileContent(
          source,
          file.path,
          accessToken,
        );
        if (!rawContent?.trim()) return [];

        const type = this.inferNodeType(file.path);
        return this.buildFileCandidates(file.path, file.sha, type, rawContent);
      }),
    );

    return [
      ...overviewNode,
      ...fileCandidates.flat().slice(0, MAX_IMPORT_NODES - overviewNode.length),
    ];
  }

  private buildOverviewNode(
    repoId: string,
    githubRepo: GithubApiRepo,
    source: GithubRepoSource,
    files: SelectedGithubFile[],
  ): IngestCandidate {
    const typeCounts = files.reduce<Record<NodeType, number>>(
      (counts, file) => {
        const type = this.inferNodeType(file.path);
        counts[type] = (counts[type] ?? 0) + 1;
        return counts;
      },
      { module: 0, api: 0, schema: 0, entry: 0, config: 0, note: 0 },
    );

    const topPaths = files
      .slice(0, 12)
      .map((file) => `- ${file.path}`)
      .join('\n');
    const content = [
      `Repository: ${source.fullName}`,
      githubRepo.description ? `Description: ${githubRepo.description}` : '',
      `Graph branch: ${source.branch}`,
      `Default branch: ${source.defaultBranch}`,
      `Detected stack: ${[githubRepo.language, ...(githubRepo.topics ?? [])].filter(Boolean).join(', ') || 'unknown'}`,
      `Node counts: module=${typeCounts.module}, api=${typeCounts.api}, schema=${typeCounts.schema}, entry=${typeCounts.entry}, config=${typeCounts.config}, note=${typeCounts.note}`,
      'Priority files:',
      topPaths,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      label: `${this.formatGithubGraphName(source)} overview`,
      sourcePath: OVERVIEW_SOURCE_PATH,
      type: 'note',
      content,
      tags: [
        'github',
        'overview',
        'repo',
        source.owner,
        source.repo,
        source.branch,
      ],
    };
  }

  private buildFileCandidates(
    filePath: string,
    fileDigest: string,
    type: NodeType,
    rawContent: string,
  ): IngestCandidate[] {
    const chunks = this.chunkContent(rawContent).slice(0, MAX_FILE_CHUNKS);
    const isInstruction = this.isInstructionFile(filePath);

    return chunks.map((chunk, index) => ({
      label: chunks.length === 1 ? filePath : `${filePath}#${index + 1}`,
      sourcePath: filePath,
      fileDigest,
      type,
      content: this.buildNodeContent(
        filePath,
        type,
        chunk,
        index + 1,
        chunks.length,
      ),
      tags: this.buildTags(filePath, type, isInstruction),
      chunkIndex: index + 1,
      totalChunks: chunks.length,
    }));
  }

  private buildGraph(
    repoId: string,
    ownerId: string,
    source: GithubRepoSource,
    files: SelectedGithubFile[],
    contextNodes: ContextNode[],
  ): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const now = new Date().toISOString();
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const seenNodeIds = new Set<string>();
    const seenEdgeIds = new Set<string>();
    const repoNodeId = this.makeGraphId(
      repoId,
      'repo',
      this.formatGithubGraphName(source),
    );

    nodes.push({
      id: repoNodeId,
      ownerId,
      repoId,
      type: 'repo',
      label: this.formatGithubGraphName(source),
      path: `${source.fullName}/${source.branch}`,
      depth: 0,
      tags: ['repo', source.owner, source.repo, source.branch],
      updatedAt: now,
    });
    seenNodeIds.add(repoNodeId);

    const pushNode = (node: GraphNode) => {
      if (seenNodeIds.has(node.id)) return;
      nodes.push(node);
      seenNodeIds.add(node.id);
    };

    const pushEdge = (edge: GraphEdge) => {
      if (seenEdgeIds.has(edge.id)) return;
      edges.push(edge);
      seenEdgeIds.add(edge.id);
    };

    for (const file of files) {
      const segments = file.path.split('/').filter(Boolean);
      let parentId = repoNodeId;
      let currentPath = '';

      for (const segment of segments.slice(0, -1)) {
        currentPath = currentPath ? `${currentPath}/${segment}` : segment;
        const directoryId = this.makeGraphId(repoId, 'directory', currentPath);
        pushNode({
          id: directoryId,
          ownerId,
          repoId,
          type: 'directory',
          label: segment,
          path: currentPath,
          parentId,
          depth: currentPath.split('/').length,
          tags: ['directory', segment],
          updatedAt: now,
        });
        pushEdge(
          this.makeGraphEdge(
            repoId,
            ownerId,
            parentId,
            directoryId,
            'contains',
            now,
          ),
        );
        parentId = directoryId;
      }

      const fileId = this.makeGraphId(repoId, 'file', file.path);
      pushNode({
        id: fileId,
        ownerId,
        repoId,
        type: 'file',
        label: segments[segments.length - 1] ?? file.path,
        path: file.path,
        parentId,
        depth: segments.length,
        digest: file.sha,
        tags: [this.inferNodeType(file.path), 'file'],
        updatedAt: now,
      });
      pushEdge(
        this.makeGraphEdge(repoId, ownerId, parentId, fileId, 'contains', now),
      );
    }

    for (const contextNode of contextNodes) {
      if (contextNode.sourcePath === OVERVIEW_SOURCE_PATH) {
        pushEdge(
          this.makeGraphEdge(
            repoId,
            ownerId,
            repoNodeId,
            contextNode.id,
            'summarizes',
            now,
          ),
        );
        continue;
      }

      if (!contextNode.sourcePath) continue;
      const fileId = this.makeGraphId(repoId, 'file', contextNode.sourcePath);
      pushEdge(
        this.makeGraphEdge(
          repoId,
          ownerId,
          fileId,
          contextNode.id,
          'contains',
          now,
        ),
      );
    }

    return { nodes, edges };
  }

  private async fetchGithubFileContent(
    source: GithubRepoSource,
    filePath: string,
    token?: string,
  ): Promise<string | null> {
    const encodedPath = filePath
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    const encodedRef = encodeURIComponent(source.branch);
    const response = await fetch(
      `https://api.github.com/repos/${source.owner}/${source.repo}/contents/${encodedPath}?ref=${encodedRef}`,
      { headers: this.githubHeaders(token) },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as GithubFileResponse;
    if (
      payload.type !== 'file' ||
      payload.encoding !== 'base64' ||
      !payload.content
    ) {
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
    if (segments.some((segment) => IGNORED_PATH_SEGMENTS.has(segment))) {
      return false;
    }

    if (size && size > MAX_FILE_BYTES) {
      return false;
    }

    const fileName = segments[segments.length - 1];
    const ext = this.getExtension(fileName);

    return (
      IMPORTANT_FILENAMES.has(fileName) ||
      INSTRUCTION_FILENAMES.has(fileName) ||
      TEXT_FILE_EXTENSIONS.has(ext)
    );
  }

  private scoreFile(filePath: string): number {
    const normalized = filePath.toLowerCase();
    const fileName = normalized.split('/').pop() ?? normalized;
    let score = 0;

    if (INSTRUCTION_FILENAMES.has(fileName)) score += 120;
    if (normalized === 'readme.md') score += 100;
    if (normalized.endsWith('package.json')) score += 90;
    if (normalized.includes('/src/')) score += 30;
    if (normalized.includes('/api/') || normalized.includes('/routes/'))
      score += 25;
    if (
      normalized.includes('/schema') ||
      normalized.endsWith('.sql') ||
      normalized.endsWith('.prisma')
    )
      score += 20;
    if (
      normalized.includes('/config') ||
      normalized.endsWith('.yml') ||
      normalized.endsWith('.yaml') ||
      normalized.endsWith('.json')
    )
      score += 15;
    if (
      normalized.includes('main.') ||
      normalized.endsWith('/index.ts') ||
      normalized.endsWith('/index.js')
    )
      score += 15;
    if (normalized.includes('test') || normalized.includes('__tests__'))
      score -= 40;
    if (normalized.includes('fixture') || normalized.includes('mock'))
      score -= 25;

    return score;
  }

  private inferNodeType(filePath: string): NodeType {
    const normalized = filePath.toLowerCase();

    if (
      this.isInstructionFile(filePath) ||
      normalized === 'readme.md' ||
      normalized.endsWith('.md')
    )
      return 'note';
    if (
      normalized.includes('docker') ||
      normalized.includes('config') ||
      normalized.endsWith('.json') ||
      normalized.endsWith('.yaml') ||
      normalized.endsWith('.yml') ||
      normalized.endsWith('.toml') ||
      normalized.endsWith('.env') ||
      normalized.endsWith('.env.example')
    )
      return 'config';
    if (
      normalized.includes('schema') ||
      normalized.endsWith('.sql') ||
      normalized.endsWith('.prisma') ||
      normalized.includes('/migrations/')
    )
      return 'schema';
    if (
      normalized.includes('/api/') ||
      normalized.includes('/routes/') ||
      normalized.includes('/controllers/') ||
      normalized.includes('/controller.') ||
      normalized.includes('/route.')
    )
      return 'api';
    if (
      normalized.endsWith('/index.ts') ||
      normalized.endsWith('/index.js') ||
      normalized.includes('main.') ||
      normalized.includes('app.') ||
      normalized.includes('server.') ||
      normalized.includes('cli.')
    )
      return 'entry';
    return 'module';
  }

  private buildNodeContent(
    filePath: string,
    type: NodeType,
    rawContent: string,
    chunkIndex: number,
    totalChunks: number,
  ): string {
    const symbols = this.extractSymbols(rawContent).slice(0, 8);
    const snippet = rawContent.trim().slice(0, MAX_SNIPPET_CHARS);
    return [
      `Path: ${filePath}`,
      `Type: ${type}`,
      totalChunks > 1 ? `Chunk: ${chunkIndex}/${totalChunks}` : '',
      symbols.length ? `Symbols: ${symbols.join(', ')}` : '',
      'Snippet:',
      snippet,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private extractSymbols(content: string): string[] {
    const matches = content.matchAll(
      /(?:export\s+)?(?:async\s+)?(?:function|class|interface|type|const|let)\s+([A-Za-z0-9_]+)/g,
    );
    return Array.from(matches, (match) => match[1]);
  }

  private buildTags(
    filePath: string,
    type: NodeType,
    isInstruction = false,
  ): string[] {
    const segments = filePath.split('/').filter(Boolean);
    const fileName = segments[segments.length - 1] ?? filePath;
    const ext = this.getExtension(fileName).replace('.', '');
    return Array.from(
      new Set(
        [
          type,
          isInstruction ? 'instruction' : undefined,
          ext || undefined,
          fileName,
          segments[0],
          segments[1],
        ].filter((value): value is string => Boolean(value)),
      ),
    );
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
    const fileName =
      filePath.toLowerCase().split('/').pop() ?? filePath.toLowerCase();
    return INSTRUCTION_FILENAMES.has(fileName);
  }

  private shouldReingest(nodes: ContextNode[]): boolean {
    if (nodes.length === 0) return true;
    return nodes.every(
      (node) =>
        !node.sourcePath ||
        node.sourcePath === OVERVIEW_SOURCE_PATH ||
        node.label.toLowerCase().endsWith(' overview'),
    );
  }

  private makeGraphId(
    repoId: string,
    type: 'repo' | 'directory' | 'file',
    path: string,
  ): string {
    return `graph:${repoId}:${type}:${Buffer.from(path).toString('base64url')}`;
  }

  private makeGraphEdge(
    repoId: string,
    ownerId: string,
    sourceId: string,
    targetId: string,
    type: GraphEdge['type'],
    updatedAt: string,
  ): GraphEdge {
    const edgeId = `edge:${repoId}:${type}:${Buffer.from(`${sourceId}:${targetId}`).toString('base64url')}`;
    return { id: edgeId, ownerId, repoId, sourceId, targetId, type, updatedAt };
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
