// @vitest-environment node

import { createHmac } from 'node:crypto';

import { readAdminSessionCookieValue } from '@/src/server/admin/session-cookie';

function signPayload(payload: string) {
  const signature = createHmac('sha256', 'groundflare-dev-admin-session-secret')
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
}

describe('session-cookie', () => {
  it('returns null for a signed payload that is not valid JSON', () => {
    const malformedPayload = Buffer.from('{"userId":', 'utf8').toString('base64url');

    expect(() => readAdminSessionCookieValue(signPayload(malformedPayload))).not.toThrow();
    expect(readAdminSessionCookieValue(signPayload(malformedPayload))).toBeNull();
  });

  it('returns null for a signed payload with an invalid session shape', () => {
    const invalidShapePayload = Buffer.from(
      JSON.stringify({ userId: 7, username: null, issuedAt: 'now', expiresAt: 'later' }),
      'utf8',
    ).toString('base64url');

    expect(readAdminSessionCookieValue(signPayload(invalidShapePayload))).toBeNull();
  });
});
