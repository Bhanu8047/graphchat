import Link from 'next/link';
import { cn } from '../../lib/ui';
import type { NavigationItem } from '../../features/navigation/config/nav-items';

type NavCardProps = {
  item: NavigationItem;
  active: boolean;
  compact?: boolean;
};

export function NavCard({ item, active, compact = false }: NavCardProps) {
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative block transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]',
        compact
          ? 'min-w-max rounded-full border border-[var(--border)] px-4 py-2 text-sm'
          : 'rounded-2xl border border-transparent px-4 py-3',
        active
          ? compact
            ? 'border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]'
            : 'bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))] text-[var(--foreground)] before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full before:bg-[var(--primary)]'
          : compact
            ? 'bg-[var(--surface)] text-[var(--muted-foreground)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]'
            : 'text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]',
      )}
    >
      <div className="font-medium">{item.label}</div>
      {!compact ? (
        <div
          className={cn(
            'mt-1 text-xs',
            active
              ? 'text-[color-mix(in_oklab,var(--foreground)_70%,transparent)]'
              : 'text-[color-mix(in_oklab,var(--muted-foreground)_80%,transparent)]',
          )}
        >
          {item.description}
        </div>
      ) : null}
    </Link>
  );
}
