'use client';

import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { MenuIcon } from '../atoms/Icon';
import { NavCard } from '../molecules/NavCard';
import { ThemeToggle } from '../molecules/ThemeToggle';
import type { NavigationItem } from '../../features/navigation/config/nav-items';

type AppHeaderProps = {
  currentItem: NavigationItem;
  quickItems: readonly NavigationItem[];
  currentPath: string;
  onOpenMenu: () => void;
};

export function AppHeader({
  currentItem,
  quickItems,
  currentPath,
  onOpenMenu,
}: AppHeaderProps) {
  return (
    <header className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/85 px-5 py-4 backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge tone="primary">Workspace</Badge>
          <h1 className="mt-3 font-display text-2xl font-medium tracking-tight text-[var(--foreground)] sm:text-3xl">
            {currentItem.label}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
            {currentItem.description}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button
            tone="secondary"
            size="sm"
            className="lg:hidden"
            onClick={onOpenMenu}
            aria-label="Open navigation menu"
          >
            <MenuIcon className="h-4 w-4" />
            <span>Menu</span>
          </Button>
        </div>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
        {quickItems.map((item) => (
          <NavCard
            key={item.href}
            item={item}
            active={currentPath === item.href}
            compact
          />
        ))}
      </div>
    </header>
  );
}
