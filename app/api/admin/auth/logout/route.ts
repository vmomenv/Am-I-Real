import { NextResponse } from 'next/server';

import {
  ADMIN_SESSION_COOKIE_NAME,
  getAdminSessionCookieOptions,
} from '@/src/server/admin/session-cookie';

export function POST(request: Request) {
  const acceptsJson = request.headers.get('accept')?.includes('application/json');
  const response = acceptsJson
    ? NextResponse.json({ authenticated: false })
    : NextResponse.redirect(new URL('/admin/login', request.url));

  response.cookies.set({
    ...getAdminSessionCookieOptions(),
    name: ADMIN_SESSION_COOKIE_NAME,
    value: '',
    maxAge: 0,
  });

  return response;
}
