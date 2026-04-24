// @vitest-environment node

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { bootstrapDatabase } from '@/src/server/db/bootstrap';
import { createDatabase } from '@/src/server/db/client';

function insertAsset(
  db: ReturnType<typeof createDatabase>,
  asset: { id: string; kind: 'ai' | 'real' | 'audio'; filePath: string; isActive?: boolean },
) {
  db.prepare(
    `INSERT INTO image_assets (
      id,
      kind,
      filePath,
      originalFilename,
      mimeType,
      width,
      height,
      fileSize,
      isActive
    ) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
  ).run(
    asset.id,
    asset.kind,
    asset.filePath,
    `${asset.id}.bin`,
    asset.kind === 'audio' ? 'audio/mpeg' : 'image/png',
    128,
    asset.isActive === false ? 0 : 1,
  );
}

describe('settings-service', () => {
  let tempDirectory: string;

  beforeEach(async () => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'groundflare-settings-'));
  });

  afterEach(async () => {
    await rm(tempDirectory, { recursive: true, force: true });
  });

  it('reads default settings and resolves the fallback audio url', async () => {
    const db = createDatabase(join(tempDirectory, 'groundflare.sqlite'));
    bootstrapDatabase(db);

    const { getSiteSettings } = await import('@/src/server/admin/settings-service');

    expect(getSiteSettings({ db })).toEqual(
      expect.objectContaining({
        id: 'default',
        displaySiteName: 'www.spark-app.store',
        successRedirectUrl: 'https://www.spark-app.store',
        audioAssetId: null,
        audioUrl: '/1.mp3',
        totalRounds: 10,
        requiredPassCount: 7,
      }),
    );

    db.close();
  });

  it('validates updates and rejects inactive referenced audio assets', async () => {
    const db = createDatabase(join(tempDirectory, 'groundflare.sqlite'));
    bootstrapDatabase(db);
    insertAsset(db, {
      id: 'audio-inactive',
      kind: 'audio',
      filePath: 'uploads/audio/inactive.mp3',
      isActive: false,
    });

    const { SettingsServiceError, updateSiteSettings } = await import(
      '@/src/server/admin/settings-service'
    );

    expect(() =>
      updateSiteSettings({
        db,
        displaySiteName: '   ',
        successRedirectUrl: 'https://www.spark-app.store',
        audioAssetId: null,
        totalRounds: 10,
        requiredPassCount: 7,
      }),
    ).toThrowError(SettingsServiceError);

    expect(() =>
      updateSiteSettings({
        db,
        displaySiteName: 'Groundflare',
        successRedirectUrl: 'not-a-url',
        audioAssetId: null,
        totalRounds: 10,
        requiredPassCount: 7,
      }),
    ).toThrowError(SettingsServiceError);

    expect(() =>
      updateSiteSettings({
        db,
        displaySiteName: 'Groundflare',
        successRedirectUrl: 'https://www.spark-app.store',
        audioAssetId: 'audio-inactive',
        totalRounds: 10,
        requiredPassCount: 7,
      }),
    ).toThrowError(
      expect.objectContaining({
          code: 'INVALID_SETTINGS',
        }),
      );

    for (let index = 0; index < 10; index += 1) {
      insertAsset(db, {
        id: `real-${index + 1}`,
        kind: 'real',
        filePath: `uploads/real/real-${index + 1}.png`,
      });
    }

    for (let index = 0; index < 7; index += 1) {
      insertAsset(db, {
        id: `ai-${index + 1}`,
        kind: 'ai',
        filePath: `uploads/ai/ai-${index + 1}.png`,
      });
    }

    expect(() =>
      updateSiteSettings({
        db,
        displaySiteName: 'Groundflare',
        successRedirectUrl: 'https://www.spark-app.store',
        audioAssetId: null,
        totalRounds: 10,
        requiredPassCount: 7,
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'INVALID_SETTINGS',
      }),
    );

    db.close();
  });

  it('stores validated settings updates and resolves uploaded audio asset urls', async () => {
    const db = createDatabase(join(tempDirectory, 'groundflare.sqlite'));
    bootstrapDatabase(db);

    for (let index = 0; index < 10; index += 1) {
      insertAsset(db, {
        id: `real-${index + 1}`,
        kind: 'real',
        filePath: `uploads/real/real-${index + 1}.png`,
      });
    }

    for (let index = 0; index < 8; index += 1) {
      insertAsset(db, {
        id: `ai-${index + 1}`,
        kind: 'ai',
        filePath: `uploads/ai/ai-${index + 1}.png`,
      });
    }

    insertAsset(db, {
      id: 'audio-active',
      kind: 'audio',
      filePath: 'uploads/audio/theme.mp3',
    });

    const { getSiteSettings, updateSiteSettings } = await import(
      '@/src/server/admin/settings-service'
    );

    const updated = updateSiteSettings({
      db,
      displaySiteName: 'admin.groundflare.test',
      successRedirectUrl: 'https://admin.groundflare.test/verified',
      audioAssetId: 'audio-active',
      totalRounds: 10,
      requiredPassCount: 7,
    });

    expect(updated).toEqual(
      expect.objectContaining({
        displaySiteName: 'admin.groundflare.test',
        successRedirectUrl: 'https://admin.groundflare.test/verified',
        audioAssetId: 'audio-active',
        audioUrl: '/uploads/audio/theme.mp3',
      }),
    );

    expect(getSiteSettings({ db })).toEqual(expect.objectContaining(updated));

    db.close();
  });
});
