'use client';

import { useRouter } from 'next/navigation';
import { Button } from '../atoms/Button';
import { Surface } from '../atoms/Surface';
import { BrandLogo } from '../molecules/BrandLogo';
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
    <aside className="flex h-full flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-5">
      <div>
        <Surface tone="hero" padding="lg">
          <BrandLogo href="/dashboard" priority className="text-white" />
          <div className="mt-4 font-display text-2xl leading-tight text-white">
            Repository graphs for persistent AI context
          </div>
          <p className="mt-3 text-sm leading-6 text-white/80">
            Store multiple branch graphs, sync them incrementally, and let
            agents query structural context instead of rereading whole
            repositories.
          </p>
        </Surface>
        <nav className="mt-6 space-y-1.5">
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
        <ThemeToggle variant="labeled" />
        <Surface tone="default" padding="md">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Signed in
          </div>
          <div className="mt-3 font-medium text-[var(--foreground)]">
            {user?.name ?? 'Unknown user'}
          </div>
          <div className="text-sm text-[var(--muted-foreground)]">
            {user?.email}
          </div>
          <Button tone="secondary" fullWidth className="mt-4" onClick={signOut}>
            Sign out
          </Button>
        </Surface>
      </div>
    </aside>
  );
}
