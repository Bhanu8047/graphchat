'use client';

import { useRouter } from 'next/navigation';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { Surface } from '../atoms/Surface';
import { NavCard } from '../molecules/NavCard';
import { ThemeToggle } from '../molecules/ThemeToggle';
import { navItems } from '../../features/navigation/config/nav-items';
import { useAuth } from '../../features/auth/providers/AuthProvider';

type AppSidebarProps = {
  currentPath: string;
};

export function AppSidebar({ currentPath }: AppSidebarProps) {
  const router = useRouter();
  const { user } = useAuth();

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/auth/sign-in');
    router.refresh();
  };

  return (
    <Surface
      tone="elevated"
      padding="lg"
      className="flex h-full flex-col justify-between"
    >
      <div>
        <Surface tone="hero" padding="lg">
          <Badge tone="accent">VectorGraph</Badge>
          <div className="mt-4 font-display text-3xl leading-tight text-slate-900 dark:text-white">
            Repository graphs for persistent AI context
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
            Store multiple branch graphs, sync them incrementally, and let
            agents query structural context instead of rereading whole
            repositories.
          </p>
        </Surface>
        <nav className="mt-6 space-y-2">
          {navItems.map((item) => (
            <NavCard
              key={item.href}
              item={item}
              active={currentPath === item.href}
            />
          ))}
        </nav>
      </div>
      <div className="space-y-4">
        <ThemeToggle />
        <Surface tone="soft" padding="md">
          <Badge>Signed in</Badge>
          <div className="mt-3 font-medium text-slate-900 dark:text-white">
            {user?.name ?? 'Unknown user'}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {user?.email}
          </div>
          <Button tone="secondary" fullWidth className="mt-4" onClick={signOut}>
            Sign out
          </Button>
        </Surface>
      </div>
    </Surface>
  );
}
