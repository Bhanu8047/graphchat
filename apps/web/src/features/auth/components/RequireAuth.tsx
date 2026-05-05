'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../providers/AuthProvider';

/**
 * Client-side gate for authenticated routes.
 *
 * While the auth session is being resolved we render a lightweight
 * placeholder so layouts (sidebar/header) don't flash. Once the session
 * resolves to "unauthenticated", we redirect to the sign-in page and
 * preserve the originally requested path via `?next=`.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { authenticated, loading } = useAuth();

  useEffect(() => {
    if (loading || authenticated) return;
    const next =
      pathname && pathname !== '/auth/sign-in'
        ? `?next=${encodeURIComponent(pathname)}`
        : '';
    router.replace(`/auth/sign-in${next}`);
  }, [authenticated, loading, pathname, router]);

  if (loading || !authenticated) {
    return (
      <div
        aria-hidden
        className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground"
      >
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
