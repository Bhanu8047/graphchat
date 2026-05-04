export const appSessionCookie = 'vectorgraph_session';

function getSessionCookieDomain() {
  const domain = process.env.APP_SESSION_COOKIE_DOMAIN?.trim();

  if (!domain) {
    return undefined;
  }

  return domain.startsWith('.') ? domain : `.${domain}`;
}

export function appSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    domain: getSessionCookieDomain(),
    maxAge: 60 * 60 * 24 * 30,
  };
}

export function expiredAppSessionCookieOptions() {
  return {
    ...appSessionCookieOptions(),
    maxAge: 0,
  };
}
