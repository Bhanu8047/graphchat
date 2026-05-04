'use client';

import Link from 'next/link';
import type { ComponentType, SVGProps } from 'react';
import { useActiveRoute } from '../../features/navigation/lib/useActiveRoute';
import { cn } from '../../lib/ui';

type NavLinkProps = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  onNavigate?: () => void;
};

export function NavLink({ href, label, icon: Icon, onNavigate }: NavLinkProps) {
  const active = useActiveRoute(href);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
        active
          ? 'bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-[var(--foreground)]'
          : 'text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-2 left-0 w-[3px] rounded-full transition',
          active ? 'bg-[var(--primary)]' : 'bg-transparent',
        )}
      />
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
