import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { appSessionCookie } from './src/features/auth/lib/auth-session';

// Public paths that never require authentication.
// `/` is the marketing landing page, so it's public too.
const publicPaths = ['/', '/auth/sign-in', '/auth/sign-up'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: ['/((?!.*\\..*).*)'],
};
