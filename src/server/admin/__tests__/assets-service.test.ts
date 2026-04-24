// @vitest-environment node

import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { bootstrapDatabase } from '@/src/server/db/bootstrap';
import { createDatabase } from '@/src/server/db/client';

describe('assets-service', () => {
  let tempDirectory: string;

  beforeEach(async () => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'groundflare-assets-'));
  });

  afterEach(async () => {
    await rm(tempDirectory, { recursive: true, force: true });
  });

  it('rejects invalid mime types for every asset kind', async () => {
    const db = createDatabase(join(tempDirectory, 'groundflare.sqlite'));
    bootstrapDatabase(db);

    const { uploadAsset } = await import('@/src/server/admin/assets-service');

    await expect(
      uploadAsset({
        db,
        uploadsDir: join(tempDirectory, 'uploads'),
        kind: 'ai',
        file: new File(['audio-bytes'], 'bad.mp3', { type: 'audio/mpeg' }),
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_FILE_TYPE',
    });

    await expect(
      uploadAsset({
        db,
        uploadsDir: join(tempDirectory, 'uploads'),
        kind: 'real',
        file: new File(['audio-bytes'], 'bad.mp3', { type: 'audio/mpeg' }),
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_FILE_TYPE',
    });

    await expect(
      uploadAsset({
        db,
        uploadsDir: join(tempDirectory, 'uploads'),
        kind: 'audio',
        file: new File(['image-bytes'], 'bad.png', { type: 'image/png' }),
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_FILE_TYPE',
    });

    db.close();
  });

  it('stores uploaded files, writes metadata, and supports filtered listing', async () => {
    const db = createDatabase(join(tempDirectory, 'groundflare.sqlite'));
    bootstrapDatabase(db);

    const { listAssets, updateAsset, uploadAsset } = await import(
      '@/src/server/admin/assets-service'
    );

    const uploadedAiAsset = await uploadAsset({
      db,
      uploadsDir: join(tempDirectory, 'uploads'),
      kind: 'ai',
      file: new File(['ai-bytes'], 'alpha-ai.png', { type: 'image/png' }),
    });

    const uploadedRealAsset = await uploadAsset({
      db,
      uploadsDir: join(tempDirectory, 'uploads'),
      kind: 'real',
      file: new File(['real-bytes'], 'beta-real.jpg', { type: 'image/jpeg' }),
    });

    const uploadedAudioAsset = await uploadAsset({
      db,
      uploadsDir: join(tempDirectory, 'uploads'),
      kind: 'audio',
      file: new File(['audio-bytes'], 'gamma-audio.mp3', { type: 'audio/mpeg' }),
    });

    await expect(access(join(tempDirectory, uploadedAiAsset.filePath))).resolves.toBeUndefined();
    await expect(readFile(join(tempDirectory, uploadedAiAsset.filePath), 'utf8')).resolves.toBe(
      'ai-bytes',
    );

    const realAssets = listAssets({
      db,
      kind: 'real',
    });

    expect(realAssets).toEqual([
      expect.objectContaining({
        id: uploadedRealAsset.id,
        kind: 'real',
        originalFilename: 'beta-real.jpg',
        mimeType: 'image/jpeg',
        isActive: true,
      }),
    ]);

    const searchResults = listAssets({
      db,
      query: 'gamma',
    });

    expect(searchResults).toEqual([
      expect.objectContaining({
        id: uploadedAudioAsset.id,
      }),
    ]);

    updateAsset({
      db,
      id: uploadedAiAsset.id,
      isActive: false,
    });

    const inactiveAssets = listAssets({
      db,
      isActive: false,
    });

    expect(inactiveAssets).toEqual([
      expect.objectContaining({
        id: uploadedAiAsset.id,
        isActive: false,
      }),
    ]);

    db.close();
  });

  it('blocks removal when an asset is referenced by site settings', async () => {
    const db = createDatabase(join(tempDirectory, 'groundflare.sqlite'));
    bootstrapDatabase(db);

    const { listAssets, removeAsset, uploadAsset } = await import(
      '@/src/server/admin/assets-service'
    );

    const uploadedAudioAsset = await uploadAsset({
      db,
      uploadsDir: join(tempDirectory, 'uploads'),
      kind: 'audio',
      file: new File(['audio-bytes'], 'theme.mp3', { type: 'audio/mpeg' }),
    });

    db.prepare('UPDATE site_settings SET audioAssetId = ? WHERE id = ?').run(
      uploadedAudioAsset.id,
      'default',
    );

    await expect(
      removeAsset({
        db,
        id: uploadedAudioAsset.id,
      }),
    ).rejects.toMatchObject({
      code: 'ASSET_IN_USE',
    });

    db.prepare('UPDATE site_settings SET audioAssetId = NULL WHERE id = ?').run('default');

    await expect(
      removeAsset({
        db,
        id: uploadedAudioAsset.id,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: uploadedAudioAsset.id,
        isActive: false,
      }),
    );

    expect(
      listAssets({
        db,
        kind: 'audio',
        isActive: false,
      }),
    ).toEqual([
      expect.objectContaining({
        id: uploadedAudioAsset.id,
        isActive: false,
      }),
    ]);

    db.close();
  });

  it('rejects deactivating an audio asset that is referenced by site settings', async () => {
    const db = createDatabase(join(tempDirectory, 'groundflare.sqlite'));
    bootstrapDatabase(db);

    const { listAssets, updateAsset, uploadAsset } = await import(
      '@/src/server/admin/assets-service'
    );

    const uploadedAudioAsset = await uploadAsset({
      db,
      uploadsDir: join(tempDirectory, 'uploads'),
      kind: 'audio',
      file: new File(['audio-bytes'], 'active-theme.mp3', { type: 'audio/mpeg' }),
    });

    db.prepare('UPDATE site_settings SET audioAssetId = ? WHERE id = ?').run(
      uploadedAudioAsset.id,
      'default',
    );

    expect(() =>
      updateAsset({
        db,
        id: uploadedAudioAsset.id,
        isActive: false,
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'ASSET_IN_USE',
      }),
    );

    expect(
      listAssets({
        db,
        kind: 'audio',
        isActive: true,
      }),
    ).toEqual([
      expect.objectContaining({
        id: uploadedAudioAsset.id,
        isActive: true,
      }),
    ]);

    db.close();
  });
});
