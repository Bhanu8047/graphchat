/**
 * Single source of truth for the `gph` CLI commands shown on `/docs`
 * and surfaced through the global Command Palette.
 *
 * Keep `cmd` formatted as `gph <name> [<args>]` — the docs anchor is
 * derived from the second whitespace-delimited token.
 */
export type CliCommandDoc = {
  cmd: string;
  flags: readonly string[];
  description: string;
  example: string;
};

export const cliCommands: readonly CliCommandDoc[] = [
  {
    cmd: 'gph login',
    flags: ['--key <api_key>', '--server <url>'],
    description:
      'Authenticate the CLI with your graphchat server using an API key (prefix sk-graphchat-). Exchanges the key for a JWT access + refresh token pair stored locally. The token is auto-refreshed before expiry.',
    example:
      'gph login --key sk-graphchat-abc123\ngph login --key sk-graphchat-abc123 --server https://your.graphchat.host',
  },
  {
    cmd: 'gph logout',
    flags: [],
    description:
      'Revokes the stored refresh token on the server and removes local credentials. After logout, any cached access token is also invalidated.',
    example: 'gph logout',
  },
  {
    cmd: 'gph status',
    flags: ['--json'],
    description:
      'Shows the currently authenticated user, server URL, and token expiry. Use --json for machine-readable output.',
    example: 'gph status\ngph status --json',
  },
  {
    cmd: 'gph repos',
    flags: ['--json'],
    description:
      'Lists all repositories accessible to the current user. Returns repo ID, name, branch, last sync time, and node count.',
    example: 'gph repos\ngph repos --json',
  },
  {
    cmd: 'gph index <path>',
    flags: ['--repo <id>', '--branch <name>'],
    description:
      'Indexes a local repository path and pushes it to the graph service. The path is resolved to an absolute path; only files within it are included. Reuses prior state so only changed files are re-processed.',
    example:
      'gph index ./src --repo my-api-id\ngph index . --repo backend --branch main',
  },
  {
    cmd: 'gph search <query>',
    flags: [
      '--repo <id>',
      '--budget <tokens>',
      '--confidence <level>',
      '--json',
      '--agent',
    ],
    description:
      'Vector + graph search across indexed repos. The --budget flag caps the token count of returned results, dropping lower-confidence nodes first. --agent emits a compact format ready to paste into an AI chat prompt. --confidence accepts EXTRACTED | INFERRED | SPECULATIVE.',
    example:
      'gph search "authentication middleware" --budget 1500\ngph search "JWT guard" --repo backend --confidence EXTRACTED --agent',
  },
  {
    cmd: 'gph query <question>',
    flags: [
      '--repo <id>',
      '--mode <knn|bfs|dfs>',
      '--hops <n>',
      '--budget <tokens>',
      '--json',
    ],
    description:
      'Graph-expanded retrieval. Embeds your natural-language question, runs vector KNN to pick seed nodes, then traverses the graph from those seeds. --mode knn (default) returns neighbours by similarity; bfs / dfs walk structural edges. --hops controls expansion depth, --budget caps the response in tokens.',
    example:
      'gph query "how does login work?" --repo my-api-id\ngph query "request lifecycle" --repo backend --mode bfs --hops 3 --budget 3000',
  },
  {
    cmd: 'gph explain <label>',
    flags: ['--repo <id>'],
    description:
      'AI-generated explanation of a single node, grounded in the graph. The CLI looks up the node by label (case-insensitive exact match), pulls its strongest neighbours, and asks the configured LLM to describe what it is, how it relates to those neighbours, and any caveats. Uses your active LLM provider from Settings → Model.',
    example:
      'gph explain AuthService --repo my-api-id\ngph explain ResponseInterceptor --repo backend',
  },
  {
    cmd: 'gph path <source> <target>',
    flags: ['--repo <id>'],
    description:
      'Finds the shortest path between two named symbols in the graph and prints every hop. Useful for understanding how middleware or dependency chains connect.',
    example:
      'gph path AuthService JwtGuard --repo my-api-id\ngph path ResponseInterceptor DatabaseService --repo backend',
  },
  {
    cmd: 'gph watch <path>',
    flags: ['--repo <id>', '--debounce <ms>', '--on-commit', '--stop'],
    description:
      'Keeps the graph in sync with a working directory. Default mode runs a local file watcher (chokidar) and re-indexes after a debounce window — only the diff is uploaded; source code stays on your machine. With --on-commit, installs idempotent post-commit / post-checkout / post-merge git hooks that re-index in the background. Use --stop with --on-commit to remove the hooks.',
    example:
      'gph watch ./src --repo my-api-id\ngph watch ./src --repo my-api-id --debounce 3000\ngph watch ./src --repo my-api-id --on-commit\ngph watch ./src --repo my-api-id --stop',
  },
  {
    cmd: 'gph report',
    flags: ['--repo <id>', '--out <file>'],
    description:
      'Generates a GRAPH_REPORT.md audit report summarising god nodes, top communities, surprise edges, and file coverage stats. Ready to paste into a PR description or agent prompt.',
    example:
      'gph report --repo my-api-id --out GRAPH_REPORT.md\ngph report --repo backend --out ./reports/backend.md',
  },
  {
    cmd: 'gph export',
    flags: ['--repo <id>', '--out <file>'],
    description:
      'Exports a full agent context payload for a named repo as a structured JSON bundle. The bundle includes graph metadata, communities, nodes, and edges — ready to feed into any LLM session.',
    example:
      'gph export --repo my-api-id --out context.json\ngph export --repo backend --out ./context/backend.json',
  },
];

/**
 * Stable per-command anchor id used by both the docs page and the
 * global command palette.
 */
export function cliCommandAnchor(command: CliCommandDoc): string {
  // `gph search <query>` → `cli-search`. Falls back to a slug of the full
  // command text if for some reason the second token is missing.
  const name = command.cmd.split(/\s+/)[1];
  return name ? `cli-${name}` : `cli-${command.cmd.replace(/\s+/g, '-')}`;
}

/**
 * Top-level documentation sections that get their own command palette
 * entries. Anchors must match the `SectionAnchor` ids on the docs page.
 */
export const docsSections = [
  {
    id: 'quickstart',
    label: 'Quickstart',
    description: 'Get up and running in minutes',
    keywords: ['quickstart', 'getting started', 'docs'],
  },
  {
    id: 'installation',
    label: 'Installation',
    description: 'Install the gph CLI',
    keywords: ['install', 'cli', 'setup'],
  },
  {
    id: 'authentication',
    label: 'Authentication',
    description: 'Authenticate with API keys and JWTs',
    keywords: ['auth', 'jwt', 'api key'],
  },
  {
    id: 'cli',
    label: 'CLI reference',
    description: 'All gph commands',
    keywords: ['cli', 'gph', 'commands'],
  },
  {
    id: 'api',
    label: 'API reference',
    description: 'REST endpoints and request shapes',
    keywords: ['api', 'rest', 'endpoints', 'http'],
  },
  {
    id: 'deployment',
    label: 'Deployment',
    description: 'Self-host with Docker Compose',
    keywords: ['deploy', 'docker', 'compose', 'self-host'],
  },
] as const;
