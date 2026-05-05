'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { cn } from '../../../lib/ui';

type Item = {
  href: string;
  label: string;
  match: (p: string) => boolean;
};

const ITEMS: Item[] = [
  { href: '/settings', label: 'Profile', match: (p) => p === '/settings' },
  {
    href: '/settings/connections',
    label: 'Connections',
    match: (p) => p.startsWith('/settings/connections'),
  },
  {
    href: '/settings/models',
    label: 'Models & Agents',
    match: (p) => p.startsWith('/settings/models'),
  },
  {
    href: '/settings/api-keys',
    label: 'Provider API Keys',
    match: (p) => p.startsWith('/settings/api-keys'),
  },
  {
    href: '/settings/trchat-keys',
    label: 'trchat API Keys',
    match: (p) => p.startsWith('/settings/trchat-keys'),
  },
];

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  // Keep the active tab in view on mobile when route changes.
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [pathname]);

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Settings sections"
        className="-mx-4 flex gap-1 overflow-x-auto border-b border-[var(--border)] px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0"
      >
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              role="tab"
              aria-selected={active}
              aria-current={active ? 'page' : undefined}
              ref={active ? activeRef : undefined}
              className={cn(
                'relative shrink-0 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors',
                'after:pointer-events-none after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:transition-colors',
                active
                  ? 'text-[var(--foreground)] after:bg-[var(--primary)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] after:bg-transparent',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
