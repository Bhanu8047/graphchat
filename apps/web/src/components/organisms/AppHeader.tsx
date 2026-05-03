'use client';

import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { Surface } from '../atoms/Surface';
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
    <Surface tone="elevated" padding="lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge>Workspace</Badge>
          <h1 className="mt-3 font-display text-2xl text-slate-900 dark:text-white sm:text-3xl">
            {currentItem.label}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            {currentItem.description}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden xl:block">
            <ThemeToggle />
          </div>
          <Button tone="secondary" className="lg:hidden" onClick={onOpenMenu}>
            Menu
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
    </Surface>
  );
}
