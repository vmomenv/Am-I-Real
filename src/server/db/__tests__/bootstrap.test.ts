// @vitest-environment node

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { bootstrapDatabase } from '@/src/server/db/bootstrap';
import { createDatabase } from '@/src/server/db/client';

describe('bootstrapDatabase', () => {
  let tempDirectory: string;

  beforeEach(async () => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'groundflare-db-'));
  });

  afterEach(async () => {
    await rm(tempDirectory, { recursive: true, force: true });
  });

  it('creates the admin tables and inserts default site settings', () => {
    const db = createDatabase(join(tempDirectory, 'nested', 'groundflare.sqlite'));

    bootstrapDatabase(db);

    const siteSettingsColumns = db
      .prepare("PRAGMA table_info('site_settings')")
      .all() as Array<{ name: string }>;

    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('admin_users', 'image_assets', 'site_settings', 'challenge_sessions') ORDER BY name",
      )
      .all() as Array<{ name: string }>;

    expect(tables.map((table) => table.name)).toEqual([
      'admin_users',
      'challenge_sessions',
      'image_assets',
      'site_settings',
    ]);

    expect(siteSettingsColumns.map((column) => column.name)).not.toContain('isActive');

    const settings = db
      .prepare(
        'SELECT displaySiteName, successRedirectUrl, audioAssetId, totalRounds, requiredPassCount FROM site_settings LIMIT 1',
      )
      .get() as {
      displaySiteName: string;
      successRedirectUrl: string;
      audioAssetId: string | null;
      totalRounds: number;
      requiredPassCount: number;
    };

    expect(settings).toEqual({
      displaySiteName: 'www.spark-app.store',
      successRedirectUrl: 'https://www.spark-app.store',
      audioAssetId: null,
      totalRounds: 10,
      requiredPassCount: 7,
    });

    db.close();
  });

  it('reuses an existing site settings row instead of inserting a default duplicate', () => {
    const db = createDatabase(join(tempDirectory, 'nested', 'groundflare.sqlite'));

    db.exec(`
      CREATE TABLE site_settings (
        id TEXT PRIMARY KEY,
        displaySiteName TEXT NOT NULL,
        successRedirectUrl TEXT NOT NULL,
        audioAssetId TEXT,
        totalRounds INTEGER NOT NULL,
        requiredPassCount INTEGER NOT NULL,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    db.prepare(
      `INSERT INTO site_settings (
        id,
        displaySiteName,
        successRedirectUrl,
        audioAssetId,
        totalRounds,
        requiredPassCount
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      'existing-settings',
      'existing.example',
      'https://existing.example',
      null,
      3,
      2,
    );

    bootstrapDatabase(db);

    const settingsCount = db
      .prepare('SELECT COUNT(*) AS count FROM site_settings')
      .get() as { count: number };

    expect(settingsCount.count).toBe(1);

    db.close();
  });
});
