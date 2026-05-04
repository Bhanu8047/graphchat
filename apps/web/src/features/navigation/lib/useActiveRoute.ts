'use client';

import { usePathname } from 'next/navigation';

/**
 * Active-route helper. Exact match for `/dashboard` (avoids matching every
 * authenticated route). All other hrefs match themselves or any nested
 * descendant (e.g. `/graphs/abc` keeps `/graphs` active).
 */
export function useActiveRoute(href: string): boolean {
  const pathname = usePathname() ?? '';
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}
