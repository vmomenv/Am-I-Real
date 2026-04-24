// @vitest-environment node

import { POST as login } from '@/app/api/admin/auth/login/route';

describe('admin auth routes', () => {
  it('returns a structured 400 response for invalid login payloads', async () => {
    const malformedJsonResponse = await login(
      new Request('http://localhost/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{"username":',
      }),
    );

    expect(malformedJsonResponse.status).toBe(400);
    await expect(malformedJsonResponse.json()).resolves.toEqual({
      code: 'INVALID_REQUEST',
      message: 'Invalid login payload.',
    });

    const nullPayloadResponse = await login(
      new Request('http://localhost/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'null',
      }),
    );

    expect(nullPayloadResponse.status).toBe(400);
    await expect(nullPayloadResponse.json()).resolves.toEqual({
      code: 'INVALID_REQUEST',
      message: 'Invalid login payload.',
    });

    const arrayPayloadResponse = await login(
      new Request('http://localhost/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '[]',
      }),
    );

    expect(arrayPayloadResponse.status).toBe(400);
    await expect(arrayPayloadResponse.json()).resolves.toEqual({
      code: 'INVALID_REQUEST',
      message: 'Invalid login payload.',
    });

    const wrongTypedCredentialsResponse = await login(
      new Request('http://localhost/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 123,
          password: 'x',
        }),
      }),
    );

    expect(wrongTypedCredentialsResponse.status).toBe(400);
    await expect(wrongTypedCredentialsResponse.json()).resolves.toEqual({
      code: 'INVALID_REQUEST',
      message: 'Invalid login payload.',
    });
  });
});
