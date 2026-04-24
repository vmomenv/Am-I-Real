import { NextResponse } from 'next/server';

import {
  getSiteSettings,
  SettingsServiceError,
  updateSiteSettings,
} from '@/src/server/admin/settings-service';
import { requireAdminSession } from '@/src/server/admin/route-auth';

function toErrorResponse(error: SettingsServiceError) {
  return NextResponse.json(
    {
      code: error.code,
      message: error.message,
    },
    { status: error.status },
  );
}

export function GET(request: Request) {
  const unauthorizedResponse = requireAdminSession(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  return NextResponse.json({ settings: getSiteSettings() });
}

export async function PATCH(request: Request) {
  const unauthorizedResponse = requireAdminSession(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const payload = await request.json();
    const settings = updateSiteSettings({
      displaySiteName: payload.displaySiteName,
      successRedirectUrl: payload.successRedirectUrl,
      audioAssetId: payload.audioAssetId ?? null,
      totalRounds: payload.totalRounds,
      requiredPassCount: payload.requiredPassCount,
    });

    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof SettingsServiceError) {
      return toErrorResponse(error);
    }

    throw error;
  }
}
