// @vitest-environment node

import { GET, PUT } from '@/app/api/admin/settings/route';
import {
  ADMIN_SESSION_COOKIE_NAME,
  createAdminSessionCookieValue,
} from '@/src/server/admin/session-cookie';

function createAuthenticatedHeaders() {
  return {
    'Content-Type': 'application/json',
    accept: 'application/json',
    cookie: `${ADMIN_SESSION_COOKIE_NAME}=${createAdminSessionCookieValue({
      userId: 'admin-user',
      username: 'admin',
    })}`,
  };
}

describe('admin settings routes', () => {
  it('rejects unauthenticated access with 401 UNAUTHORIZED', async () => {
    const getResponse = await GET(
      new Request('http://localhost/api/admin/settings', {
        headers: {
          accept: 'application/json',
        },
      }),
    );

    expect(getResponse.status).toBe(401);
    await expect(getResponse.json()).resolves.toEqual({
      code: 'UNAUTHORIZED',
      message: 'Admin authentication required.',
    });

    const putResponse = await PUT(
      new Request('http://localhost/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          displaySiteName: 'example.test',
          successRedirectUrl: 'https://example.test',
          audioAssetId: null,
          totalRounds: 10,
          requiredPassCount: 7,
        }),
      }),
    );

    expect(putResponse.status).toBe(401);
    await expect(putResponse.json()).resolves.toEqual({
      code: 'UNAUTHORIZED',
      message: 'Admin authentication required.',
    });
  });

  it('returns a structured 400 response for malformed settings payloads', async () => {
    const malformedJsonResponse = await PUT(
      new Request('http://localhost/api/admin/settings', {
        method: 'PUT',
        headers: createAuthenticatedHeaders(),
        body: '{"displaySiteName":',
      }),
    );

    expect(malformedJsonResponse.status).toBe(400);
    await expect(malformedJsonResponse.json()).resolves.toEqual({
      code: 'INVALID_REQUEST',
      message: 'Invalid settings payload.',
    });

    const nullPayloadResponse = await PUT(
      new Request('http://localhost/api/admin/settings', {
        method: 'PUT',
        headers: createAuthenticatedHeaders(),
        body: 'null',
      }),
    );

    expect(nullPayloadResponse.status).toBe(400);
    await expect(nullPayloadResponse.json()).resolves.toEqual({
      code: 'INVALID_REQUEST',
      message: 'Invalid settings payload.',
    });

    const wrongTypedPayloadResponse = await PUT(
      new Request('http://localhost/api/admin/settings', {
        method: 'PUT',
        headers: createAuthenticatedHeaders(),
        body: JSON.stringify({
          displaySiteName: 123,
          successRedirectUrl: 'https://example.test',
          audioAssetId: null,
          totalRounds: 10,
          requiredPassCount: 7,
        }),
      }),
    );

    expect(wrongTypedPayloadResponse.status).toBe(400);
    await expect(wrongTypedPayloadResponse.json()).resolves.toEqual({
      code: 'INVALID_REQUEST',
      message: 'Invalid settings payload.',
    });
  });
});
