import { fileURLToPath } from 'node:url';

import type Database from 'better-sqlite3';

import { getDatabase } from '@/src/server/db/client';

const DEFAULT_SITE_SETTINGS = {
  displaySiteName: 'www.spark-app.store',
  successRedirectUrl: 'https://www.spark-app.store',
  totalRounds: 10,
  requiredPassCount: 7,
};

const DEFAULT_CHALLENGE_SESSION_CONFIG = JSON.stringify({
  successRedirectUrl: DEFAULT_SITE_SETTINGS.successRedirectUrl,
  totalRounds: DEFAULT_SITE_SETTINGS.totalRounds,
  requiredPassCount: DEFAULT_SITE_SETTINGS.requiredPassCount,
});

function ensureChallengeSessionConfigColumn(db: Database.Database) {
  const challengeSessionColumns = db
    .prepare("PRAGMA table_info('challenge_sessions')")
    .all() as Array<{ name: string }>;

  if (!challengeSessionColumns.some((column) => column.name === 'sessionConfigJson')) {
    db.exec(
      `ALTER TABLE challenge_sessions
       ADD COLUMN sessionConfigJson TEXT NOT NULL DEFAULT '${DEFAULT_CHALLENGE_SESSION_CONFIG}'`,
    );
  }
}

export function bootstrapDatabase(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS image_assets (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      filePath TEXT NOT NULL,
      originalFilename TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      fileSize INTEGER NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      id TEXT PRIMARY KEY,
      displaySiteName TEXT NOT NULL,
      successRedirectUrl TEXT NOT NULL,
      audioAssetId TEXT,
      totalRounds INTEGER NOT NULL,
      requiredPassCount INTEGER NOT NULL,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS challenge_sessions (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      startedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      finishedAt TEXT,
      currentRoundIndex INTEGER NOT NULL DEFAULT 0,
      correctCount INTEGER NOT NULL DEFAULT 0,
      mistakeCount INTEGER NOT NULL DEFAULT 0,
      roundPlanJson TEXT NOT NULL,
      sessionConfigJson TEXT NOT NULL DEFAULT '${DEFAULT_CHALLENGE_SESSION_CONFIG}'
    );
  `);

  ensureChallengeSessionConfigColumn(db);

  const existingSettings = db
    .prepare('SELECT id FROM site_settings LIMIT 1')
    .get() as { id: string } | undefined;

  if (!existingSettings) {
    db.prepare(
      `INSERT INTO site_settings (
        id,
        displaySiteName,
        successRedirectUrl,
        audioAssetId,
        totalRounds,
        requiredPassCount
      ) VALUES (
        @id,
        @displaySiteName,
        @successRedirectUrl,
        @audioAssetId,
        @totalRounds,
        @requiredPassCount
      )`,
    ).run({
      id: 'default',
      ...DEFAULT_SITE_SETTINGS,
      audioAssetId: null,
    });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  bootstrapDatabase(getDatabase());
}
