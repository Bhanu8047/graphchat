import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getServerApiBaseUrl } from '../../../../lib/github-auth';
import { appSessionCookie } from '../../../../features/auth/lib/auth-session';

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(appSessionCookie)?.value;

  if (!sessionToken) {
    return NextResponse.json({ authenticated: false });
  }

  const response = await fetch(`${getServerApiBaseUrl()}/auth/session`, {
    headers: {
      Cookie: `${appSessionCookie}=${sessionToken}`,
    },
  });

  if (!response.ok) {
    cookieStore.delete(appSessionCookie);
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json(await response.json());
}