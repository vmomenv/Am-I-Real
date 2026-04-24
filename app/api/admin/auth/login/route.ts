import { NextResponse } from 'next/server';

import { authenticateAdmin, normalizeAdminUsername } from '@/src/server/admin/auth-service';
import {
  clearAdminLoginThrottle,
  getAdminLoginThrottleStatus,
  recordFailedAdminLogin,
} from '@/src/server/admin/login-throttle';
import {
  createAdminSessionCookieValue,
  getAdminSessionCookieOptions,
} from '@/src/server/admin/session-cookie';

function getInvalidPayloadResponse() {
  return NextResponse.json(
    {
      code: 'INVALID_REQUEST',
      message: 'Invalid login payload.',
    },
    { status: 400 },
  );
}

function hasValidCredentialTypes(
  payload: { username?: unknown; password?: unknown },
): payload is { username?: string; password?: string } {
  const usernameIsValid = payload.username === undefined || typeof payload.username === 'string';
  const passwordIsValid = payload.password === undefined || typeof payload.password === 'string';

  return usernameIsValid && passwordIsValid;
}

export async function POST(request: Request) {
  let parsedPayload: unknown;

  try {
    parsedPayload = await request.json();
  } catch {
    return getInvalidPayloadResponse();
  }

  if (!parsedPayload || typeof parsedPayload !== 'object' || Array.isArray(parsedPayload)) {
    return getInvalidPayloadResponse();
  }

  const payload = parsedPayload as {
    username?: unknown;
    password?: unknown;
  };

  if (!hasValidCredentialTypes(payload)) {
    return getInvalidPayloadResponse();
  }

  const throttleIdentity = {
    username: payload.username ? normalizeAdminUsername(payload.username) : '',
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
    username: throttleIdentity.username,
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
