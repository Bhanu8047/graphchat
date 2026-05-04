import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  githubAccessTokenCookie,
  githubOauthStateCookie,
} from '../../../../lib/github-auth';
import {
  appSessionCookie,
  expiredAppSessionCookieOptions,
} from '../../../../features/auth/lib/auth-session';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(appSessionCookie, '', expiredAppSessionCookieOptions());
  cookieStore.delete(githubAccessTokenCookie);
  cookieStore.delete(githubOauthStateCookie);
  return NextResponse.json({ ok: true });
}
