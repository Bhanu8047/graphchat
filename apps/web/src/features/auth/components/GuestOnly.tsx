'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../providers/AuthProvider';

/**
 * Inverse of `RequireAuth` — used on `/auth/sign-in` and `/auth/sign-up`
 * to bounce already-authenticated users back to the app. Honours the
 * `?next=` query string so post-login redirects continue to work.
 */
export function GuestOnly({
  children,
  fallback = '/dashboard',
}: {
  children: ReactNode;
  fallback?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authenticated, loading } = useAuth();

  useEffect(() => {
    if (loading || !authenticated) return;
    const next = searchParams.get('next');
    // Only follow `next` when it's an internal path — refuse protocol-relative
    // or absolute URLs to avoid open-redirect vectors.
    const target =
      next && next.startsWith('/') && !next.startsWith('//') ? next : fallback;
    router.replace(target);
  }, [authenticated, loading, fallback, router, searchParams]);

  if (loading || authenticated) {
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
