'use client';

import { Button } from '../atoms/Button';
import { BellIcon, MenuIcon, SearchIcon } from '../atoms/Icon';
import { BreadcrumbTrail } from '../molecules/BreadcrumbTrail';
import { ThemeToggle } from '../molecules/ThemeToggle';
import { UserMenu } from '../molecules/UserMenu';

type AppHeaderProps = {
  onOpenMenu: () => void;
};

export function AppHeader({ onOpenMenu }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)]/85 px-4 backdrop-blur-xl sm:px-6">
      <Button
        tone="ghost"
        size="sm"
        onClick={onOpenMenu}
        className="lg:hidden"
        aria-label="Open navigation menu"
      >
        <MenuIcon className="h-4 w-4" />
      </Button>

      <div className="hidden min-w-0 flex-1 items-center md:flex">
        <BreadcrumbTrail />
      </div>

      <div className="hidden flex-1 justify-center md:flex">
        <button
          type="button"
          className="flex w-full max-w-md items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2 text-sm text-[var(--muted-foreground)] transition hover:border-[var(--border-strong)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          aria-label="Open search"
        >
          <SearchIcon className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate text-left">
            Search graphs, repos…
          </span>
          <kbd className="hidden rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[0.65rem] font-medium text-[var(--muted-foreground)] sm:inline">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          aria-label="Open search"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] transition hover:border-[var(--border-strong)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] md:hidden"
        >
          <SearchIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="hidden h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] transition hover:border-[var(--border-strong)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] sm:inline-flex"
        >
          <BellIcon className="h-4 w-4" />
        </button>
        <div className="hidden sm:inline-flex">
          <ThemeToggle />
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
