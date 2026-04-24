// @vitest-environment node

import { GET, PUT } from '@/app/api/admin/settings/route';

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
});
