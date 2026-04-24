import { NextResponse } from 'next/server';

import {
  ADMIN_SESSION_COOKIE_NAME,
  readAdminSessionCookieValue,
} from '@/src/server/admin/session-cookie';

export function GET(request: Request) {
  const cookieStore = new Headers(request.headers);
  const cookieHeader = cookieStore.get('cookie') ?? '';
  const sessionCookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE_NAME}=`))
    ?.slice(ADMIN_SESSION_COOKIE_NAME.length + 1);
  const session = readAdminSessionCookieValue(sessionCookie);

  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.userId,
      username: session.username,
    },
  });
}
