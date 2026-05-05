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

export type NavSection =
  | 'workspace'
  | 'intelligence'
  | 'output'
  | 'account'
  | 'admin';

export type NavigationItem = {
  href: string;
  label: string;
  description: string;
  section: NavSection;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** When true, only renders for users with role === 'admin'. */
  adminOnly?: boolean;
};

export const navItems: readonly NavigationItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    description: 'Overview and recent graphs',
    section: 'workspace',
    icon: HomeIcon,
  },
  {
    href: '/repos',
    label: 'Repositories',
    description: 'Import and sync GitHub branches',
    section: 'workspace',
    icon: RepoIcon,
  },
  {
    href: '/graphs',
    label: 'Graphs',
    description: 'Explore generated graph structure',
    section: 'workspace',
    icon: GraphIcon,
  },
  {
    href: '/search',
    label: 'Search',
    description: 'Semantic retrieval across graphs',
    section: 'intelligence',
    icon: SearchIcon,
  },
  {
    href: '/ai',
    label: 'AI Assist',
    description: 'Generate nodes and graph context',
    section: 'intelligence',
    icon: SparkleIcon,
  },
  {
    href: '/usage',
    label: 'Usage',
    description: 'Per-model request volumes',
    section: 'intelligence',
    icon: SparkleIcon,
  },
  {
    href: '/export',
    label: 'Export',
    description: 'Agent-ready graph payloads',
    section: 'output',
    icon: ExportIcon,
  },
  {
    href: '/settings',
    label: 'Settings',
    description: 'Profile, models, keys, connections',
    section: 'account',
    icon: SettingsIcon,
  },
  {
    href: '/admin',
    label: 'Admin',
    description: 'Rate limits & users',
    section: 'admin',
    icon: SettingsIcon,
    adminOnly: true,
  },
];

export const navSections: ReadonlyArray<{
  id: NavSection;
  label: string;
}> = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'intelligence', label: 'Intelligence' },
  { id: 'output', label: 'Output' },
  { id: 'account', label: 'Account' },
  { id: 'admin', label: 'Admin' },
];
