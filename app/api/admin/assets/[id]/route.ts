import { NextResponse } from 'next/server';

import {
  AssetServiceError,
  removeAsset,
  updateAsset,
} from '@/src/server/admin/assets-service';
import { requireAdminSession } from '@/src/server/admin/route-auth';

function getInvalidRequestResponse() {
  return NextResponse.json(
    {
      code: 'INVALID_REQUEST',
      message: 'Invalid asset update payload.',
    },
    { status: 400 },
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const unauthorizedResponse = requireAdminSession(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return getInvalidRequestResponse();
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return getInvalidRequestResponse();
  }

  const { isActive } = payload as { isActive?: unknown };

  if (typeof isActive !== 'boolean') {
    return getInvalidRequestResponse();
  }

  try {
    const asset = updateAsset({
      id: params.id,
      isActive,
    });

    return NextResponse.json({ asset });
  } catch (error) {
    if (error instanceof AssetServiceError) {
      return NextResponse.json(
        {
          code: error.code,
          message: error.message,
        },
        { status: error.status },
      );
    }

    throw error;
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const unauthorizedResponse = requireAdminSession(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const asset = await removeAsset({ id: params.id });

    return NextResponse.json({ asset, removed: true });
  } catch (error) {
    if (error instanceof AssetServiceError) {
      return NextResponse.json(
        {
          code: error.code,
          message: error.message,
        },
        { status: error.status },
      );
    }

    throw error;
  }
}
