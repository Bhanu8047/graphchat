'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRightIcon } from '../atoms/Icon';
import { navItems } from '../../features/navigation/config/nav-items';

function labelForSegment(segment: string, fullHref: string): string {
  const match = navItems.find((item) => item.href === fullHref);
  if (match) return match.label;
  return decodeURIComponent(segment).replace(/[-_]/g, ' ');
}

export function BreadcrumbTrail() {
  const pathname = usePathname() ?? '/';
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    return { href, label: labelForSegment(segment, href) };
  });

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 text-sm text-[var(--muted-foreground)]">
        <li className="hidden truncate sm:inline">Workspace</li>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={crumb.href} className="flex min-w-0 items-center gap-1">
              <ChevronRightIcon className="hidden h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]/60 sm:inline" />
              {isLast ? (
                <span className="truncate font-medium capitalize text-[var(--foreground)]">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="truncate capitalize transition hover:text-[var(--foreground)]"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
