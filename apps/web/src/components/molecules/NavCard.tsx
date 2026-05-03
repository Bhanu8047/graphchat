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
      className={cn(
        'group block border transition duration-200',
        compact
          ? 'min-w-max rounded-full px-4 py-2 text-sm'
          : 'rounded-[22px] px-4 py-3',
        active
          ? 'border-cyan-300/60 bg-cyan-100 text-cyan-900 shadow-[0_12px_30px_rgba(103,232,249,0.2)] dark:border-cyan-300/35 dark:bg-cyan-400/12 dark:text-white dark:shadow-[0_12px_30px_rgba(34,211,238,0.12)]'
          : 'border-slate-200/80 bg-white/65 text-slate-700 hover:border-slate-300 hover:bg-white dark:border-white/6 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-white/12 dark:hover:bg-white/[0.06] dark:hover:text-white',
      )}
    >
      <div className="font-medium">{item.label}</div>
      {!compact ? (
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {item.description}
        </div>
      ) : null}
    </Link>
  );
}
