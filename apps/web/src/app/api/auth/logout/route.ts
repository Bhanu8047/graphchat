import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  githubAccessTokenCookie,
  githubOauthStateCookie,
} from '../../../../lib/github-auth';
import { appSessionCookie } from '../../../../features/auth/lib/auth-session';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(appSessionCookie);
  cookieStore.delete(githubAccessTokenCookie);
  cookieStore.delete(githubOauthStateCookie);
  return NextResponse.json({ ok: true });
}
