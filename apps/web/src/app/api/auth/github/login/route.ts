import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  getGithubOauthConfig,
  githubAuthCookieOptions,
  githubOauthStateCookie,
} from '../../../../../lib/github-auth';

export async function GET(request: NextRequest) {
  const { clientId, callbackUrl, isConfigured } = getGithubOauthConfig(request.url);
  const redirectTarget = new URL('/?tab=repos&githubAuth=config-error', request.url);

  if (!isConfigured || !clientId) {
    return NextResponse.redirect(redirectTarget);
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(githubOauthStateCookie, state, {
    ...githubAuthCookieOptions(),
    maxAge: 60 * 10,
  });

  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', callbackUrl);
  authorizeUrl.searchParams.set('scope', 'repo read:user');
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('allow_signup', 'true');

  return NextResponse.redirect(authorizeUrl);
}