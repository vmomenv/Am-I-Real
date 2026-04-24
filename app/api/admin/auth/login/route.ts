import { NextResponse } from 'next/server';

import { authenticateAdmin } from '@/src/server/admin/auth-service';
import {
  createAdminSessionCookieValue,
  getAdminSessionCookieOptions,
} from '@/src/server/admin/session-cookie';

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    username?: string;
    password?: string;
  };

  if (!payload.username || !payload.password) {
    return NextResponse.json(
      {
        code: 'UNAUTHORIZED',
        message: 'Username and password are required.',
      },
      { status: 401 },
    );
  }

  const adminUser = await authenticateAdmin({
    username: payload.username,
    password: payload.password,
  });

  if (!adminUser) {
    return NextResponse.json(
      {
        code: 'UNAUTHORIZED',
        message: 'Invalid username or password.',
      },
      { status: 401 },
    );
  }

  const response = NextResponse.json({
    authenticated: true,
    user: {
      id: adminUser.id,
      username: adminUser.username,
    },
  });

  response.cookies.set({
    ...getAdminSessionCookieOptions(),
    value: createAdminSessionCookieValue({
      userId: adminUser.id,
      username: adminUser.username,
    }),
  });

  return response;
}
