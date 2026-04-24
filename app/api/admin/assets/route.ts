import { NextResponse } from 'next/server';

import { AssetServiceError, listAssets } from '@/src/server/admin/assets-service';
import { requireAdminSession } from '@/src/server/admin/route-auth';

export function GET(request: Request) {
  const unauthorizedResponse = requireAdminSession(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const kindParam = searchParams.get('kind');
    const isActiveParam = searchParams.get('isActive');

    const assets = listAssets({
      kind:
        kindParam === 'ai' || kindParam === 'real' || kindParam === 'audio' ? kindParam : undefined,
      query: searchParams.get('q') ?? undefined,
      isActive:
        isActiveParam === 'true' ? true : isActiveParam === 'false' ? false : undefined,
    });

    return NextResponse.json({ assets });
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
