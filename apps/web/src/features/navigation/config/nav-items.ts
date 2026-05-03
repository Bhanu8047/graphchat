export const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    description: 'Overview and recent graphs',
  },
  {
    href: '/repos',
    label: 'Repositories',
    description: 'Import and sync GitHub branches',
  },
  {
    href: '/graphs',
    label: 'Graphs',
    description: 'Explore generated graph structure',
  },
  {
    href: '/search',
    label: 'Search',
    description: 'Semantic retrieval across graphs',
  },
  {
    href: '/ai',
    label: 'AI Assist',
    description: 'Generate nodes and graph context',
  },
  {
    href: '/export',
    label: 'Export',
    description: 'Agent-ready graph payloads',
  },
  {
    href: '/settings',
    label: 'Settings',
    description: 'Account and session controls',
  },
] as const;

export type NavigationItem = (typeof navItems)[number];
