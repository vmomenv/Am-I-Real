import { cookies, headers } from 'next/headers';

import { AdminDualImageDesk } from '@/src/components/admin/AdminDualImageDesk';
import { listAssets } from '@/src/server/admin/assets-service';
import { getSiteSettings, type SiteSettings } from '@/src/server/admin/settings-service';

type SaveSettingsInput = {
  displaySiteName: string;
  successRedirectUrl: string;
  audioAssetId: string | null;
  totalRounds: number;
  requiredPassCount: number;
};

type SettingsResponse = {
  settings: SiteSettings;
  message?: string;
};

type UploadResponse = {
  asset: {
    id: string;
    originalFilename: string;
  };
  message?: string;
};

function getApiBaseUrl() {
  const headerStore = headers();
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host') ?? 'localhost:3000';
  const protocol = headerStore.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');

  return `${protocol}://${host}`;
}

function getPayloadErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object' || !('message' in payload)) {
    return null;
  }

  const { message } = payload as { message?: unknown };

  return typeof message === 'string' ? message : null;
}

export default function AdminHomePage() {
  const aiAssets = listAssets({ kind: 'ai' });
  const realAssets = listAssets({ kind: 'real' });
  const settings = getSiteSettings();

  async function handleSaveSettings(input: SaveSettingsInput) {
    'use server';

    const response = await fetch(`${getApiBaseUrl()}/api/admin/settings`, {
      method: 'PUT',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        cookie: cookies().toString(),
      },
      body: JSON.stringify(input),
      cache: 'no-store',
    });

    const payload = (await response.json()) as unknown;

    if (!response.ok) {
      throw new Error(getPayloadErrorMessage(payload) ?? '保存失败，请重试。');
    }

    return payload as SettingsResponse;
  }

  async function handleUploadAudio(file: File) {
    'use server';

    const formData = new FormData();
    formData.set('kind', 'audio');
    formData.set('file', file);

    const response = await fetch(`${getApiBaseUrl()}/api/admin/assets/upload`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        cookie: cookies().toString(),
      },
      body: formData,
      cache: 'no-store',
    });

    const payload = (await response.json()) as unknown;

    if (!response.ok) {
      throw new Error(getPayloadErrorMessage(payload) ?? '上传音频失败，请重试。');
    }

    const { asset } = payload as UploadResponse;

    return {
      option: {
        label: asset.originalFilename,
        value: asset.id,
      },
    };
  }

  return (
    <AdminDualImageDesk
      aiAssets={aiAssets}
      onSaveSettings={handleSaveSettings}
      onUploadAudio={handleUploadAudio}
      realAssets={realAssets}
      settings={settings}
    />
  );
}
