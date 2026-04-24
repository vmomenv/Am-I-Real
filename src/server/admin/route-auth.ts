import { NextResponse } from 'next/server';

import {
  ADMIN_SESSION_COOKIE_NAME,
  readAdminSessionCookieValue,
} from '@/src/server/admin/session-cookie';

function getAdminSessionCookie(headers: Headers) {
  const cookieHeader = headers.get('cookie') ?? '';

  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE_NAME}=`))
    ?.slice(ADMIN_SESSION_COOKIE_NAME.length + 1);
}

export function requireAdminSession(request: Request) {
  const session = readAdminSessionCookieValue(getAdminSessionCookie(new Headers(request.headers)));

  if (!session) {
    return NextResponse.json(
      {
        code: 'UNAUTHORIZED',
        message: 'Admin authentication required.',
      },
      { status: 401 },
    );
  }

  return null;
}
