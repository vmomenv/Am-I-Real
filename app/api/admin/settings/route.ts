import { NextResponse } from 'next/server';

import {
  getSiteSettings,
  SettingsServiceError,
  updateSiteSettings,
} from '@/src/server/admin/settings-service';
import { requireAdminSession } from '@/src/server/admin/route-auth';

type SettingsPayload = {
  displaySiteName: string;
  successRedirectUrl: string;
  audioAssetId: string | null;
  totalRounds: number;
  requiredPassCount: number;
};

function toErrorResponse(error: SettingsServiceError) {
  return NextResponse.json(
    {
      code: error.code,
      message: error.message,
    },
    { status: error.status },
  );
}

function getInvalidPayloadResponse() {
  return NextResponse.json(
    {
      code: 'INVALID_REQUEST',
      message: 'Invalid settings payload.',
    },
    { status: 400 },
  );
}

function isValidSettingsPayload(payload: unknown): payload is SettingsPayload {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return false;
  }

  const candidate = payload as Record<string, unknown>;

  return (
    typeof candidate.displaySiteName === 'string' &&
    typeof candidate.successRedirectUrl === 'string' &&
    (candidate.audioAssetId === null || typeof candidate.audioAssetId === 'string') &&
    typeof candidate.totalRounds === 'number' &&
    typeof candidate.requiredPassCount === 'number'
  );
}

export function GET(request: Request) {
  const unauthorizedResponse = requireAdminSession(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  return NextResponse.json({ settings: getSiteSettings() });
}

export async function PUT(request: Request) {
  const unauthorizedResponse = requireAdminSession(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return getInvalidPayloadResponse();
  }

  if (!isValidSettingsPayload(payload)) {
    return getInvalidPayloadResponse();
  }

  try {
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
