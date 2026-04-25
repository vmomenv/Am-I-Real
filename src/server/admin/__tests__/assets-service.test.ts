// @vitest-environment node

import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { bootstrapDatabase } from '@/src/server/db/bootstrap';
import { createDatabase } from '@/src/server/db/client';

const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIGNATURE = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);

function createPngFile(name: string, body = 'png-body') {
  return new File([PNG_SIGNATURE, body], name, { type: 'image/png' });
}

function createJpegFile(name: string, body = 'jpeg-body') {
  return new File([JPEG_SIGNATURE, body], name, { type: 'image/jpeg' });
}

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
        file: createPngFile('bad.png', 'image-bytes'),
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_FILE_TYPE',
    });

    await expect(
      uploadAsset({
        db,
        uploadsDir: join(tempDirectory, 'uploads'),
        kind: 'ai',
        file: new File(['not-a-real-image'], 'looks-like-image.png', { type: 'image/png' }),
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

    for (let index = 0; index < 10; index += 1) {
      await uploadAsset({
        db,
        uploadsDir: join(tempDirectory, 'uploads'),
        kind: 'real',
        file: createPngFile(`support-real-${index + 1}.png`, `real-${index}`),
      });
    }

    for (let index = 0; index < 8; index += 1) {
      await uploadAsset({
        db,
        uploadsDir: join(tempDirectory, 'uploads'),
        kind: 'ai',
        file: createPngFile(`support-ai-${index + 1}.png`, `support-ai-${index}`),
      });
    }

    const uploadedAiAsset = await uploadAsset({
      db,
      uploadsDir: join(tempDirectory, 'uploads'),
      kind: 'ai',
      file: createPngFile('alpha-ai.png', 'ai-bytes'),
    });

    const uploadedRealAsset = await uploadAsset({
      db,
      uploadsDir: join(tempDirectory, 'uploads'),
      kind: 'real',
      file: createJpegFile('beta-real.jpg', 'real-bytes'),
    });

    const uploadedAudioAsset = await uploadAsset({
      db,
      uploadsDir: join(tempDirectory, 'uploads'),
      kind: 'audio',
      file: new File(['audio-bytes'], 'gamma-audio.mp3', { type: 'audio/mpeg' }),
    });

    await expect(access(join(tempDirectory, uploadedAiAsset.filePath))).resolves.toBeUndefined();
    await expect(readFile(join(tempDirectory, uploadedAiAsset.filePath))).resolves.toBeInstanceOf(Buffer);

    const realAssets = listAssets({
      db,
      kind: 'real',
    });

    expect(realAssets).toContainEqual(
      expect.objectContaining({
        id: uploadedRealAsset.id,
        kind: 'real',
        originalFilename: 'beta-real.jpg',
        mimeType: 'image/jpeg',
        isActive: true,
      }),
    );

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

  it('persists stable public upload paths when the physical uploads directory is customized', async () => {
    const db = createDatabase(join(tempDirectory, 'groundflare.sqlite'));
    bootstrapDatabase(db);

    const { uploadAsset } = await import('@/src/server/admin/assets-service');
    const customUploadsDirectory = join(tempDirectory, 'groundflare-storage');

    const uploadedAsset = await uploadAsset({
      db,
      uploadsDir: customUploadsDirectory,
      kind: 'audio',
      file: new File(['audio-bytes'], 'theme.mp3', { type: 'audio/mpeg' }),
    });

    expect(uploadedAsset.filePath).toMatch(/^uploads\/audio\/.+\.mp3$/);
    await expect(readFile(join(customUploadsDirectory, 'audio', uploadedAsset.filePath.split('/').at(-1)!), 'utf8')).resolves.toBe(
      'audio-bytes',
    );

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
        uploadsDir: join(tempDirectory, 'uploads'),
      }),
    ).rejects.toMatchObject({
      code: 'ASSET_IN_USE',
    });

    db.prepare('UPDATE site_settings SET audioAssetId = NULL WHERE id = ?').run('default');

    await expect(
      removeAsset({
        db,
        id: uploadedAudioAsset.id,
        uploadsDir: join(tempDirectory, 'uploads'),
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: uploadedAudioAsset.id,
        kind: 'audio',
      }),
    );

    expect(
      listAssets({
        db,
        kind: 'audio',
      }),
    ).toEqual([]);

    await expect(access(join(tempDirectory, uploadedAudioAsset.filePath))).rejects.toThrow();

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

  it('allows deactivating or removing real/ai assets even when that drops below the recommended pool size', async () => {
    const db = createDatabase(join(tempDirectory, 'groundflare.sqlite'));
    bootstrapDatabase(db);

    const { removeAsset, updateAsset, uploadAsset } = await import('@/src/server/admin/assets-service');

    const realAssets = [] as Array<{ id: string }>;

    for (let index = 0; index < 10; index += 1) {
      realAssets.push(
        await uploadAsset({
          db,
          uploadsDir: join(tempDirectory, 'uploads'),
          kind: 'real',
          file: createPngFile(`real-${index + 1}.png`, `real-${index}`),
        }),
      );
    }

    const aiAssets = [] as Array<{ id: string }>;

    for (let index = 0; index < 8; index += 1) {
      aiAssets.push(
        await uploadAsset({
          db,
          uploadsDir: join(tempDirectory, 'uploads'),
          kind: 'ai',
          file: createPngFile(`ai-${index + 1}.png`, `ai-${index}`),
        }),
      );
    }

    expect(() =>
      updateAsset({
        db,
        id: realAssets[0].id,
        isActive: false,
      }),
    ).not.toThrow();

    expect(() =>
      updateAsset({
        db,
        id: aiAssets[0].id,
        isActive: false,
      }),
    ).not.toThrow();

    await expect(
      removeAsset({
        db,
        id: aiAssets[1].id,
        uploadsDir: join(tempDirectory, 'uploads'),
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: aiAssets[1].id,
        kind: 'ai',
      }),
    );

    db.close();
  });

  it('allows deactivating and removing real/ai assets when the pool is already below the configured minimum', async () => {
    const db = createDatabase(join(tempDirectory, 'groundflare.sqlite'));
    bootstrapDatabase(db);

    const { removeAsset, updateAsset, uploadAsset } = await import('@/src/server/admin/assets-service');

    const uploadedRealAsset = await uploadAsset({
      db,
      uploadsDir: join(tempDirectory, 'uploads'),
      kind: 'real',
      file: createPngFile('real-1.png', 'real-bytes'),
    });

    const uploadedAiAsset = await uploadAsset({
      db,
      uploadsDir: join(tempDirectory, 'uploads'),
      kind: 'ai',
      file: createPngFile('ai-1.png', 'ai-bytes'),
    });

    expect(() =>
      updateAsset({
        db,
        id: uploadedRealAsset.id,
        isActive: false,
      }),
    ).not.toThrow();

    await expect(
      removeAsset({
        db,
        id: uploadedAiAsset.id,
        uploadsDir: join(tempDirectory, 'uploads'),
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: uploadedAiAsset.id,
        kind: 'ai',
      }),
    );

    await expect(
      removeAsset({
        db,
        id: uploadedAiAsset.id,
        uploadsDir: join(tempDirectory, 'uploads'),
      }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });

    db.close();
  });

  it('renames an asset and trims the incoming filename', async () => {
    const db = createDatabase(join(tempDirectory, 'groundflare.sqlite'));
    bootstrapDatabase(db);

    const { renameAsset, uploadAsset } = await import('@/src/server/admin/assets-service');

    const uploadedAsset = await uploadAsset({
      db,
      uploadsDir: join(tempDirectory, 'uploads'),
      kind: 'real',
      file: createJpegFile('portrait.jpg', 'real-bytes'),
    });

    expect(() =>
      renameAsset({
        db,
        id: uploadedAsset.id,
        originalFilename: '   hero-shot.png   ',
      }),
    ).not.toThrow();

    expect(
      renameAsset({
        db,
        id: uploadedAsset.id,
        originalFilename: 'detail-shot.png',
      }),
    ).toEqual(
      expect.objectContaining({
        id: uploadedAsset.id,
        originalFilename: 'detail-shot.png',
      }),
    );

    db.close();
  });
});
