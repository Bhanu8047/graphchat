'use client';

import { BrandLogo } from '../molecules/BrandLogo';
import { NavSection } from '../molecules/NavSection';
import { ThemeToggle } from '../molecules/ThemeToggle';
import {
  navItems,
  navSections,
} from '../../features/navigation/config/nav-items';
import { useAuth } from '../../features/auth/providers/AuthProvider';

type AppSidebarProps = {
  onNavigate?: () => void;
};

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const { user } = useAuth();

  let runningIndex = 0;

  return (
    <aside
      aria-label="Primary"
      className="flex h-full w-full flex-col overflow-hidden bg-[var(--surface-muted)]"
    >
      <div className="flex h-16 shrink-0 items-center border-b border-[var(--border)] px-5">
        <BrandLogo href="/dashboard" priority />
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {navSections.map((section) => {
          const items = navItems.filter((item) => item.section === section.id);
          if (items.length === 0) return null;
          const baseIndex = runningIndex;
          runningIndex += items.length;
          return (
            <NavSection
              key={section.id}
              label={section.label}
              items={items}
              baseIndex={baseIndex}
              onNavigate={onNavigate}
            />
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-[var(--border)] px-4 py-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-[var(--foreground)]">
              {user?.name ?? 'Signed in'}
            </div>
            <div className="truncate text-xs text-[var(--muted-foreground)]">
              {user?.email}
            </div>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </aside>
  );
}
