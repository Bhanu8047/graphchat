'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { BrandLogo } from '../molecules/BrandLogo';
import { ThemeToggle } from '../molecules/ThemeToggle';
import { buttonStyles } from '../atoms/buttonStyles';
import {
  ChevronDownIcon,
  LogOutIcon,
  SearchIcon,
  SettingsIcon,
} from '../atoms/Icon';
import { useAuth } from '../../features/auth/providers/AuthProvider';
import { cn } from '../../lib/ui';
import { CommandPalette } from './CommandPalette';

function initials(name?: string | null) {
  if (!name) return '··';
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '··'
  );
}

function AuthedNav() {
  const { user, setUser, refresh } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const signOut = async () => {
    setOpen(false);
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(undefined);
    router.replace('/auth/sign-in');
    router.refresh();
    await refresh();
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className={cn(
            'flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] py-1 pl-1 pr-3 text-sm font-medium text-[var(--foreground)] transition',
            'hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
          )}
        >
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-[0.7rem] font-semibold text-[var(--primary-foreground)]"
          >
            {initials(user?.name ?? user?.email)}
          </span>
          <span className="hidden max-w-[7rem] truncate sm:inline">
            {user?.name?.split(' ')[0] ?? 'Account'}
          </span>
          <ChevronDownIcon className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
        </button>
        <AnimatePresence>
          {open ? (
            <motion.div
              role="menu"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="absolute right-0 mt-2 w-60 origin-top-right overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_24px_60px_-30px_color-mix(in_oklab,var(--color-space-indigo-900)_50%,transparent)]"
            >
              <div className="border-b border-[var(--border)] px-4 py-3">
                <div className="truncate text-sm font-medium text-[var(--foreground)]">
                  {user?.name ?? 'Signed in'}
                </div>
                <div className="truncate text-xs text-[var(--muted-foreground)]">
                  {user?.email}
                </div>
              </div>
              <div className="p-1">
                <Link
                  href="/dashboard"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
                >
                  Dashboard
                </Link>
                <Link
                  href="/settings"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
                >
                  <SettingsIcon className="h-4 w-4 text-[var(--muted-foreground)]" />
                  Settings
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={signOut}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
                >
                  <LogOutIcon className="h-4 w-4 text-[var(--muted-foreground)]" />
                  Sign out
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

function GuestNav() {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Link
        href="/auth/sign-in"
        className={cn(
          buttonStyles({ tone: 'ghost', size: 'sm' }),
          'hidden sm:inline-flex',
        )}
      >
        Sign in
      </Link>
      <Link
        href="/auth/sign-up"
        className={buttonStyles({ tone: 'primary', size: 'sm' })}
      >
        Get started
      </Link>
    </div>
  );
}

export function MarketingHeader() {
  const { authenticated, loading } = useAuth();
  const pathname = usePathname();
  const hideCapabilities = pathname === '/' || pathname === '/capabilities';
  const [scrolled, setScrolled] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Global ⌘K / Ctrl+K shortcut to toggle the palette on marketing pages too.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-colors duration-300',
        scrolled
          ? 'border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--background)_82%,transparent)] backdrop-blur-xl'
          : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <BrandLogo href="/" priority />
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label="Open search"
            className={cn(
              'group hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] py-1.5 pl-3 pr-1.5 text-xs font-medium text-[var(--muted-foreground)] transition sm:inline-flex',
              'hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
            )}
          >
            <SearchIcon className="h-3.5 w-3.5" />
            <span>Search</span>
            <kbd className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-1.5 py-0.5 font-mono text-[0.6rem] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] group-hover:bg-[var(--surface)]">
              ⌘K
            </kbd>
          </button>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label="Open search"
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] transition sm:hidden',
              'hover:border-[var(--border-strong)] hover:text-[var(--foreground)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
            )}
          >
            <SearchIcon className="h-4 w-4" />
          </button>
          <ThemeToggle />
          {!hideCapabilities ? (
            <Link
              href="/capabilities"
              className={cn(
                buttonStyles({ tone: 'ghost', size: 'sm' }),
                'hidden sm:inline-flex',
              )}
            >
              Capabilities
            </Link>
          ) : null}
          <Link
            href="/docs"
            className={cn(
              buttonStyles({ tone: 'ghost', size: 'sm' }),
              'hidden sm:inline-flex',
            )}
          >
            Docs
          </Link>
          {!loading && (authenticated ? <AuthedNav /> : <GuestNav />)}
        </div>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </header>
  );
}
