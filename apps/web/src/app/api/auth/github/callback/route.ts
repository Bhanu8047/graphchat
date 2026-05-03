import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  getGithubOauthConfig,
  githubAccessTokenCookie,
  githubAuthCookieOptions,
  githubOauthStateCookie,
  getServerApiBaseUrl,
} from '../../../../../lib/github-auth';
import {
  appSessionCookie,
  appSessionCookieOptions,
} from '../../../../../features/auth/lib/auth-session';

type GithubAccessTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const { clientId, clientSecret, callbackUrl, appOrigin, isConfigured } =
    getGithubOauthConfig(request.url);
  const redirectUrl = new URL('/repos', appOrigin);
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(githubOauthStateCookie)?.value;

  cookieStore.delete(githubOauthStateCookie);

  if (!isConfigured || !clientId || !clientSecret) {
    redirectUrl.searchParams.set('githubAuth', 'config-error');
    return NextResponse.redirect(redirectUrl);
  }

  if (!code || !state || !expectedState || expectedState !== state) {
    redirectUrl.searchParams.set('githubAuth', 'state-error');
    return NextResponse.redirect(redirectUrl);
  }

  const tokenResponse = await fetch(
    'https://github.com/login/oauth/access_token',
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        state,
        redirect_uri: callbackUrl,
      }),
    },
  );

  if (!tokenResponse.ok) {
    redirectUrl.searchParams.set('githubAuth', 'token-error');
    return NextResponse.redirect(redirectUrl);
  }

  const payload = (await tokenResponse.json()) as GithubAccessTokenResponse;

  if (!payload.access_token || payload.error) {
    redirectUrl.searchParams.set('githubAuth', payload.error ?? 'token-error');
    return NextResponse.redirect(redirectUrl);
  }

  cookieStore.set(githubAccessTokenCookie, payload.access_token, {
    ...githubAuthCookieOptions(),
    maxAge: 60 * 60 * 24 * 30,
  });

  const authResponse = await fetch(`${getServerApiBaseUrl()}/auth/github`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ accessToken: payload.access_token }),
  });

  const authPayload = await authResponse.json().catch(() => null);
  if (!authResponse.ok || !authPayload?.sessionToken) {
    redirectUrl.pathname = '/auth/sign-in';
    redirectUrl.searchParams.set('githubAuth', 'token-error');
    return NextResponse.redirect(redirectUrl);
  }

  cookieStore.set(
    appSessionCookie,
    authPayload.sessionToken,
    appSessionCookieOptions(),
  );

  redirectUrl.searchParams.set('githubAuth', 'connected');
  return NextResponse.redirect(redirectUrl);
}
