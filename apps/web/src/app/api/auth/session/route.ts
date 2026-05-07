import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getServerApiBaseUrl } from '../../../../lib/github-auth';
import {
  appSessionCookie,
  expiredAppSessionCookieOptions,
} from '../../../../features/auth/lib/auth-session';

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(appSessionCookie)?.value;

  if (!sessionToken) {
    return NextResponse.json({ authenticated: false });
  }

  let response: Response;
  try {
    response = await fetch(`${getServerApiBaseUrl()}/auth/session`, {
      headers: {
        Cookie: `${appSessionCookie}=${sessionToken}`,
      },
    });
  } catch {
    // API is unreachable — return a degraded but non-crashing response so the
    // web app doesn't enter an infinite reload loop.
    return NextResponse.json({ authenticated: false, apiUnavailable: true });
  }

  if (!response.ok) {
    cookieStore.set(appSessionCookie, '', expiredAppSessionCookieOptions());
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json(await response.json());
}
