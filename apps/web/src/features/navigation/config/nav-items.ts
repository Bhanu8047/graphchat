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

export type NavSection = 'workspace' | 'intelligence' | 'output' | 'account';

export type NavigationItem = {
  href: string;
  label: string;
  description: string;
  section: NavSection;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
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
    href: '/export',
    label: 'Export',
    description: 'Agent-ready graph payloads',
    section: 'output',
    icon: ExportIcon,
  },
  {
    href: '/settings',
    label: 'Settings',
    description: 'Account and session controls',
    section: 'account',
    icon: SettingsIcon,
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
];
