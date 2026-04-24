import { NextResponse } from 'next/server';

import { authenticateAdmin } from '@/src/server/admin/auth-service';
import {
  clearAdminLoginThrottle,
  getAdminLoginThrottleStatus,
  recordFailedAdminLogin,
} from '@/src/server/admin/login-throttle';
import {
  createAdminSessionCookieValue,
  getAdminSessionCookieOptions,
} from '@/src/server/admin/session-cookie';

function getClientIpAddress(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');

  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  return request.headers.get('x-real-ip') ?? 'unknown';
}

function getInvalidPayloadResponse() {
  return NextResponse.json(
    {
      code: 'INVALID_REQUEST',
      message: 'Invalid login payload.',
    },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  let parsedPayload: unknown;

  try {
    parsedPayload = await request.json();
  } catch {
    return getInvalidPayloadResponse();
  }

  if (!parsedPayload || typeof parsedPayload !== 'object') {
    return getInvalidPayloadResponse();
  }

  const payload = parsedPayload as {
    username?: string;
    password?: string;
  };
  const throttleIdentity = {
    ipAddress: getClientIpAddress(request),
    username: payload.username?.trim() ?? '',
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

  const throttleStatus = getAdminLoginThrottleStatus(throttleIdentity);

  if (throttleStatus.isBlocked) {
    return NextResponse.json(
      {
        code: 'TOO_MANY_ATTEMPTS',
        message: 'Too many failed login attempts. Please try again later.',
      },
      { status: 429 },
    );
  }

  const adminUser = await authenticateAdmin({
    username: payload.username,
    password: payload.password,
  });

  if (!adminUser) {
    const updatedThrottleStatus = recordFailedAdminLogin(throttleIdentity);

    return NextResponse.json(
      {
        code: updatedThrottleStatus.isBlocked ? 'TOO_MANY_ATTEMPTS' : 'UNAUTHORIZED',
        message: updatedThrottleStatus.isBlocked
          ? 'Too many failed login attempts. Please try again later.'
          : 'Invalid username or password.',
      },
      { status: updatedThrottleStatus.isBlocked ? 429 : 401 },
    );
  }

  clearAdminLoginThrottle(throttleIdentity);

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
