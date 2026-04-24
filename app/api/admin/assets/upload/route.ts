import { NextResponse } from 'next/server';

import { AssetServiceError, uploadAsset } from '@/src/server/admin/assets-service';
import { requireAdminSession } from '@/src/server/admin/route-auth';

function getInvalidRequestResponse() {
  return NextResponse.json(
    {
      code: 'INVALID_REQUEST',
      message: 'Invalid asset upload payload.',
    },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  const unauthorizedResponse = requireAdminSession(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return getInvalidRequestResponse();
  }

  const kind = formData.get('kind');
  const file = formData.get('file');

  if ((kind !== 'ai' && kind !== 'real' && kind !== 'audio') || !(file instanceof File)) {
    return getInvalidRequestResponse();
  }

  try {
    const asset = await uploadAsset({ kind, file });

    return NextResponse.json({ asset }, { status: 201 });
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
