import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  githubAccessTokenCookie,
  githubOauthStateCookie,
} from '../../../../../lib/github-auth';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(githubAccessTokenCookie);
  cookieStore.delete(githubOauthStateCookie);
  return NextResponse.json({ ok: true });
}
