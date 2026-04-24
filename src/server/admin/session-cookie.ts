import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_SESSION_COOKIE_NAME = 'groundflare-admin-session';
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

type AdminSessionIdentity = {
  userId: string;
  username: string;
};

export type AdminSession = AdminSessionIdentity & {
  issuedAt: number;
  expiresAt: number;
};

function getAdminSessionSecret() {
  if (process.env.ADMIN_SESSION_SECRET) {
    return process.env.ADMIN_SESSION_SECRET;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'groundflare-dev-admin-session-secret';
  }

  throw new Error('ADMIN_SESSION_SECRET must be set in production.');
}

function signValue(value: string) {
  return createHmac('sha256', getAdminSessionSecret()).update(value).digest('base64url');
}

export function createAdminSessionCookieValue(identity: AdminSessionIdentity) {
  const issuedAt = Date.now();
  const session: AdminSession = {
    ...identity,
    issuedAt,
    expiresAt: issuedAt + ADMIN_SESSION_MAX_AGE_SECONDS * 1000,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');

  return `${payload}.${signValue(payload)}`;
}

export function readAdminSessionCookieValue(cookieValue: string | undefined) {
  if (!cookieValue) {
    return null;
  }

  const [payload, signature] = cookieValue.split('.');

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signValue(payload);
  const actualSignature = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (actualSignature.length !== expectedSignatureBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(actualSignature, expectedSignatureBuffer)) {
    return null;
  }

  const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AdminSession;

  if (session.expiresAt <= Date.now()) {
    return null;
  }

  return session;
}

export function getAdminSessionCookieOptions() {
  return {
    name: ADMIN_SESSION_COOKIE_NAME,
    httpOnly: true,
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };
}
