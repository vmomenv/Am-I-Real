// @vitest-environment node

import { DELETE, PATCH } from '@/app/api/admin/assets/[id]/route';
import { GET as listAssets } from '@/app/api/admin/assets/route';
import { POST as uploadAsset } from '@/app/api/admin/assets/upload/route';

describe('admin asset routes', () => {
  it('rejects unauthenticated access with 401 UNAUTHORIZED', async () => {
    const listResponse = await listAssets(
      new Request('http://localhost/api/admin/assets?kind=ai', {
        headers: {
          accept: 'application/json',
        },
      }),
    );

    expect(listResponse.status).toBe(401);
    await expect(listResponse.json()).resolves.toEqual({
      code: 'UNAUTHORIZED',
      message: 'Admin authentication required.',
    });

    const formData = new FormData();
    formData.set('kind', 'ai');
    formData.set('file', new File(['bytes'], 'asset.png', { type: 'image/png' }));

    const uploadResponse = await uploadAsset(
      new Request('http://localhost/api/admin/assets/upload', {
        method: 'POST',
        body: formData,
        headers: {
          accept: 'application/json',
        },
      }),
    );

    expect(uploadResponse.status).toBe(401);
    await expect(uploadResponse.json()).resolves.toEqual({
      code: 'UNAUTHORIZED',
      message: 'Admin authentication required.',
    });

    const patchResponse = await PATCH(
      new Request('http://localhost/api/admin/assets/asset-1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({ isActive: false }),
      }),
      { params: { id: 'asset-1' } },
    );

    expect(patchResponse.status).toBe(401);
    await expect(patchResponse.json()).resolves.toEqual({
      code: 'UNAUTHORIZED',
      message: 'Admin authentication required.',
    });

    const deleteResponse = await DELETE(
      new Request('http://localhost/api/admin/assets/asset-1', {
        method: 'DELETE',
        headers: {
          accept: 'application/json',
        },
      }),
      { params: { id: 'asset-1' } },
    );

    expect(deleteResponse.status).toBe(401);
    await expect(deleteResponse.json()).resolves.toEqual({
      code: 'UNAUTHORIZED',
      message: 'Admin authentication required.',
    });
  });
});
