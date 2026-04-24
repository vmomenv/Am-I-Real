// @vitest-environment node

import { DELETE, PATCH } from '@/app/api/admin/assets/[id]/route';

vi.mock('@/src/server/admin/route-auth', () => ({
  requireAdminSession: vi.fn(() => null),
}));

vi.mock('@/src/server/admin/assets-service', async () => {
  const actual = await vi.importActual<typeof import('@/src/server/admin/assets-service')>(
    '@/src/server/admin/assets-service',
  );

  return {
    ...actual,
    updateAsset: vi.fn(() => ({ id: 'asset-1', isActive: false })),
    removeAsset: vi.fn(async () => ({ id: 'asset-1', isActive: false })),
    renameAsset: vi.fn(() => ({ id: 'asset-1', originalFilename: 'renamed.png' })),
  };
});
import { GET as listAssets } from '@/app/api/admin/assets/route';
import { POST as uploadAsset } from '@/app/api/admin/assets/upload/route';

describe('admin asset routes', () => {
  it('rejects unauthenticated access with 401 UNAUTHORIZED', async () => {
    const { requireAdminSession } = await import('@/src/server/admin/route-auth');
    vi.mocked(requireAdminSession).mockImplementation(
      () =>
      Response.json(
        {
          code: 'UNAUTHORIZED',
          message: 'Admin authentication required.',
        },
        { status: 401 },
      ),
    );
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

    vi.mocked(requireAdminSession).mockReturnValue(null);
  });

  it('routes rename payloads through PATCH', async () => {
    const { renameAsset, updateAsset } = await import('@/src/server/admin/assets-service');

    const response = await PATCH(
      new Request('http://localhost/api/admin/assets/asset-1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({ originalFilename: 'renamed.png' }),
      }),
      { params: { id: 'asset-1' } },
    );

    expect(response.status).toBe(200);
    expect(vi.mocked(renameAsset)).toHaveBeenCalledWith({
      id: 'asset-1',
      originalFilename: 'renamed.png',
    });
    expect(vi.mocked(updateAsset)).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      asset: { id: 'asset-1', originalFilename: 'renamed.png' },
    });
  });
});
