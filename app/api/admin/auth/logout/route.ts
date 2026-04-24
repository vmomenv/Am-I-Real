import { NextResponse } from 'next/server';

import {
  ADMIN_SESSION_COOKIE_NAME,
  getAdminSessionCookieOptions,
} from '@/src/server/admin/session-cookie';

export function POST() {
  const response = NextResponse.json({ authenticated: false });

  response.cookies.set({
    ...getAdminSessionCookieOptions(),
    name: ADMIN_SESSION_COOKIE_NAME,
    value: '',
    maxAge: 0,
  });

  return response;
}
