'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDownIcon, LogOutIcon, SettingsIcon } from '../atoms/Icon';
import { useAuth } from '../../features/auth/providers/AuthProvider';
import { cn } from '../../lib/ui';

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

export function UserMenu() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
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
    router.replace('/auth/sign-in');
    router.refresh();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
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
        <span className="hidden max-w-[8rem] truncate sm:inline">
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
            className="absolute right-0 mt-2 w-64 origin-top-right overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_24px_60px_-30px_color-mix(in_oklab,var(--color-space-indigo-900)_50%,transparent)]"
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
  );
}
