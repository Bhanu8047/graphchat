import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getServerApiBaseUrl } from '../../../../../lib/github-auth';
import { appSessionCookie } from '../../../../../features/auth/lib/auth-session';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(appSessionCookie)?.value;
  if (!sessionToken) {
    return NextResponse.json({ message: 'Not signed in.' }, { status: 401 });
  }

  const body = await request.json();
  const response = await fetch(`${getServerApiBaseUrl()}/auth/cli/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `${appSessionCookie}=${sessionToken}`,
    },
    body: JSON.stringify(body),
  });

  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }
  const payload = await response.json().catch(() => null);
  return NextResponse.json(payload ?? { message: 'Approval failed.' }, {
    status: response.status || 400,
  });
}
