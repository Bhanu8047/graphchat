import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getServerApiBaseUrl } from '../../../../lib/github-auth';
import { appSessionCookie, appSessionCookieOptions } from '../../../../features/auth/lib/auth-session';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const response = await fetch(`${getServerApiBaseUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.sessionToken) {
    return NextResponse.json(payload ?? { message: 'Unable to sign in.' }, { status: response.status || 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set(appSessionCookie, payload.sessionToken, appSessionCookieOptions());
  return NextResponse.json({ user: payload.user, authenticated: true });
}