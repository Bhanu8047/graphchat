import type { ComponentType, SVGProps } from 'react';
import {
  ExportIcon,
  GraphIcon,
  HomeIcon,
  RepoIcon,
  SearchIcon,
  SettingsIcon,
  SparkleIcon,
} from '../../../components/atoms/Icon';

export type StaticSearchTarget = {
  id: string;
  label: string;
  description: string;
  href: string;
  group: 'Pages' | 'Settings' | 'Documentation';
  keywords: string[];
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Hide from results unless the current user is an admin. */
  adminOnly?: boolean;
};

export const staticSearchTargets: readonly StaticSearchTarget[] = [
  // Pages
  {
    id: 'page-dashboard',
    label: 'Dashboard',
    description: 'Overview and recent graphs',
    href: '/dashboard',
    group: 'Pages',
    keywords: ['home', 'overview', 'stats'],
    icon: HomeIcon,
  },
  {
    id: 'page-repos',
    label: 'Repositories',
    description: 'Import and sync GitHub branches',
    href: '/repos',
    group: 'Pages',
    keywords: ['repo', 'github', 'import', 'branch'],
    icon: RepoIcon,
  },
  {
    id: 'page-graphs',
    label: 'Graphs',
    description: 'Explore generated graph structure',
    href: '/graphs',
    group: 'Pages',
    keywords: ['graph', 'nodes', 'visualize'],
    icon: GraphIcon,
  },
  {
    id: 'page-search',
    label: 'Semantic search',
    description: 'Run semantic retrieval across graphs',
    href: '/search',
    group: 'Pages',
    keywords: ['search', 'query', 'vector', 'retrieval'],
    icon: SearchIcon,
  },
  {
    id: 'page-ai',
    label: 'AI Assist',
    description: 'Generate nodes and graph context',
    href: '/ai',
    group: 'Pages',
    keywords: ['ai', 'assist', 'llm', 'generate'],
    icon: SparkleIcon,
  },
  {
    id: 'page-usage',
    label: 'Usage',
    description: 'Per-model request volumes',
    href: '/usage',
    group: 'Pages',
    keywords: ['usage', 'metrics', 'tokens'],
    icon: SparkleIcon,
  },
  {
    id: 'page-export',
    label: 'Export',
    description: 'Agent-ready graph payloads',
    href: '/export',
    group: 'Pages',
    keywords: ['export', 'download', 'bundle'],
    icon: ExportIcon,
  },
  {
    id: 'page-admin',
    label: 'Admin',
    description: 'Rate limits and users',
    href: '/admin',
    group: 'Pages',
    keywords: ['admin', 'users', 'rate limits'],
    icon: SettingsIcon,
    adminOnly: true,
  },

  // Settings
  {
    id: 'settings-profile',
    label: 'Account & profile',
    description: 'Update your name, email, and password',
    href: '/settings',
    group: 'Settings',
    keywords: ['settings', 'profile', 'account', 'password'],
    icon: SettingsIcon,
  },
  {
    id: 'settings-models',
    label: 'Models',
    description: 'Configure embedding and chat models',
    href: '/settings/models',
    group: 'Settings',
    keywords: ['models', 'embedding', 'chat', 'llm', 'openai'],
    icon: SettingsIcon,
  },
  {
    id: 'settings-api-keys',
    label: 'Provider API keys',
    description: 'OpenAI, Anthropic and other provider credentials',
    href: '/settings/api-keys',
    group: 'Settings',
    keywords: ['api keys', 'openai', 'anthropic', 'provider', 'credentials'],
    icon: SettingsIcon,
  },
  {
    id: 'settings-trchat-keys',
    label: 'trchat API keys',
    description: 'CLI authentication keys (sk-trchat-…)',
    href: '/settings/trchat-keys',
    group: 'Settings',
    keywords: ['trchat keys', 'cli', 'gph', 'token', 'sk-trchat'],
    icon: SettingsIcon,
  },
  {
    id: 'settings-connections',
    label: 'Connections',
    description: 'GitHub and other linked accounts',
    href: '/settings/connections',
    group: 'Settings',
    keywords: ['github', 'connection', 'oauth', 'integration'],
    icon: SettingsIcon,
  },

  // Documentation
  {
    id: 'docs-quickstart',
    label: 'Docs · Quickstart',
    description: 'Get up and running in minutes',
    href: '/docs#quickstart',
    group: 'Documentation',
    keywords: ['quickstart', 'getting started', 'docs'],
    icon: SparkleIcon,
  },
  {
    id: 'docs-installation',
    label: 'Docs · Installation',
    description: 'Install the gph CLI',
    href: '/docs#installation',
    group: 'Documentation',
    keywords: ['install', 'cli', 'setup'],
    icon: SparkleIcon,
  },
  {
    id: 'docs-authentication',
    label: 'Docs · Authentication',
    description: 'Authenticate with API keys and JWTs',
    href: '/docs#authentication',
    group: 'Documentation',
    keywords: ['auth', 'jwt', 'api key'],
    icon: SparkleIcon,
  },
  {
    id: 'docs-cli',
    label: 'Docs · CLI reference',
    description: 'All gph commands',
    href: '/docs#cli',
    group: 'Documentation',
    keywords: ['cli', 'gph', 'commands'],
    icon: SparkleIcon,
  },
  {
    id: 'docs-api',
    label: 'Docs · API reference',
    description: 'REST endpoints and request shapes',
    href: '/docs#api',
    group: 'Documentation',
    keywords: ['api', 'rest', 'endpoints', 'http'],
    icon: SparkleIcon,
  },
  {
    id: 'docs-deployment',
    label: 'Docs · Deployment',
    description: 'Self-host with Docker Compose',
    href: '/docs#deployment',
    group: 'Documentation',
    keywords: ['deploy', 'docker', 'compose', 'self-host'],
    icon: SparkleIcon,
  },
  {
    id: 'changelog',
    label: 'Changelog',
    description: 'Release notes and recent changes',
    href: '/changelog',
    group: 'Documentation',
    keywords: ['changelog', 'release', 'notes', 'updates'],
    icon: SparkleIcon,
  },
];
