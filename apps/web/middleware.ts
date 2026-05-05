import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { appSessionCookie } from './src/features/auth/lib/auth-session';

// Public paths that never require authentication.
// `/` is the marketing landing page, so it's public too.
const publicPaths = ['/', '/auth/sign-in', '/auth/sign-up'];

// Hosts that may legitimately serve this app. Anything else is treated as a
// spoof / cloned deployment and either redirected to the canonical host or
// blocked outright. Configure via env at deploy time:
//   APP_TRUSTED_HOSTS=graphchat.co,www.graphchat.co
//   APP_CANONICAL_HOST=graphchat.co
function getTrustedHosts(): string[] {
  const raw = process.env.APP_TRUSTED_HOSTS ?? '';
  const explicit = raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  // Always allow localhost variants so dev and container healthchecks work.
  return Array.from(
    new Set([...explicit, 'localhost', '127.0.0.1', '0.0.0.0', '::1']),
  );
}

function getCanonicalHost(): string | undefined {
  const fromEnv = process.env.APP_CANONICAL_HOST?.trim().toLowerCase();
  if (fromEnv) return fromEnv;
  // Fall back to the public app URL host if it's set.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return undefined;
  try {
    return new URL(appUrl).host.toLowerCase();
  } catch {
    return undefined;
  }
}

function normalizeHost(rawHost: string | null): string {
  if (!rawHost) return '';
  // Strip any port so `host:3000` matches `host`.
  return rawHost.toLowerCase().split(':')[0];
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Host validation runs first so an attacker cannot bypass it by hitting
  // an internal Next route or static asset.
  const trustedHosts = getTrustedHosts();
  const canonicalHost = getCanonicalHost();
  const requestHost = normalizeHost(request.headers.get('host'));
  const hostAllowlistConfigured =
    trustedHosts.length > 4 || Boolean(canonicalHost);

  if (hostAllowlistConfigured && requestHost) {
    const allowed =
      trustedHosts.includes(requestHost) ||
      (canonicalHost && requestHost === canonicalHost);

    if (!allowed) {
      // Skip Next internals / favicon to avoid breaking error pages.
      const isInternalAsset =
        pathname.startsWith('/_next') || pathname === '/favicon.ico';

      if (!isInternalAsset) {
        if (canonicalHost) {
          const redirectUrl = new URL(request.nextUrl);
          redirectUrl.host = canonicalHost;
          redirectUrl.protocol = 'https:';
          redirectUrl.port = '';
          return NextResponse.redirect(redirectUrl, 308);
        }
        return new NextResponse('Forbidden host', { status: 421 });
      }
    }
  }

  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get(appSessionCookie)?.value;
  const isPublicPath = publicPaths.some(
    (path) =>
      pathname === path || (path !== '/' && pathname.startsWith(`${path}/`)),
  );

  // Unauthenticated visitors hitting an app route → sign-in
  if (!session && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/sign-in';
    return NextResponse.redirect(url);
  }

  // Authenticated visitors landing on `/` or auth pages → dashboard
  if (
    session &&
    (pathname === '/' ||
      pathname === '/auth/sign-in' ||
      pathname === '/auth/sign-up' ||
      pathname.startsWith('/auth/sign-in/') ||
      pathname.startsWith('/auth/sign-up/'))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Match every request, including assets, so host validation runs first.
  matcher: ['/:path*'],
};
