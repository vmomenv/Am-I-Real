import type Database from 'better-sqlite3';

import { bootstrapDatabase } from '@/src/server/db/bootstrap';
import { getDatabase } from '@/src/server/db/client';

const DEFAULT_AUDIO_URL = '/1.mp3';

type SiteSettingsRow = {
  id: string;
  displaySiteName: string;
  successRedirectUrl: string;
  audioAssetId: string | null;
  totalRounds: number;
  requiredPassCount: number;
  updatedAt: string;
};

type AudioAssetRow = {
  id: string;
  kind: string;
  filePath: string;
  isActive: number;
};

type PoolCounts = {
  realCount: number;
  aiCount: number;
};

export type SiteSettings = SiteSettingsRow & {
  audioUrl: string;
};

export type UpdateSiteSettingsInput = {
  db?: Database.Database;
  displaySiteName: string;
  successRedirectUrl: string;
  audioAssetId: string | null;
  totalRounds: number;
  requiredPassCount: number;
};

export class SettingsServiceError extends Error {
  constructor(
    readonly code: 'INVALID_SETTINGS',
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'SettingsServiceError';
  }
}

function getReadyDatabase(db = getDatabase()) {
  bootstrapDatabase(db);
  return db;
}

function requireSettingsRow(db: Database.Database) {
  const row = db
    .prepare(
      `SELECT id, displaySiteName, successRedirectUrl, audioAssetId, totalRounds, requiredPassCount, updatedAt
       FROM site_settings
       LIMIT 1`,
    )
    .get() as SiteSettingsRow | undefined;

  if (!row) {
    throw new SettingsServiceError('INVALID_SETTINGS', 'Site settings were not initialized.', 500);
  }

  return row;
}

function getAudioAsset(db: Database.Database, audioAssetId: string | null) {
  if (!audioAssetId) {
    return null;
  }

  return db
    .prepare('SELECT id, kind, filePath, isActive FROM image_assets WHERE id = ? LIMIT 1')
    .get(audioAssetId) as AudioAssetRow | undefined;
}

function getActivePoolCounts(db: Database.Database): PoolCounts {
  return db
    .prepare(
      `SELECT
         SUM(CASE WHEN kind = 'real' AND isActive = 1 THEN 1 ELSE 0 END) AS realCount,
         SUM(CASE WHEN kind = 'ai' AND isActive = 1 THEN 1 ELSE 0 END) AS aiCount
       FROM image_assets`,
    )
    .get() as PoolCounts;
}

function requireValidUrl(value: string) {
  try {
    const url = new URL(value);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('invalid');
    }
  } catch {
    throw new SettingsServiceError('INVALID_SETTINGS', 'Success redirect URL must be absolute.', 400);
  }
}

function validateSettings(db: Database.Database, input: UpdateSiteSettingsInput) {
  if (!input.displaySiteName.trim()) {
    throw new SettingsServiceError('INVALID_SETTINGS', 'Display site name is required.', 400);
  }

  requireValidUrl(input.successRedirectUrl);

  if (!Number.isInteger(input.totalRounds) || input.totalRounds !== 10) {
    throw new SettingsServiceError('INVALID_SETTINGS', 'Groundflare challenges must use 10 rounds.', 400);
  }

  if (
    !Number.isInteger(input.requiredPassCount) ||
    input.requiredPassCount < 1 ||
    input.requiredPassCount > input.totalRounds
  ) {
    throw new SettingsServiceError('INVALID_SETTINGS', 'Required pass count is out of range.', 400);
  }

  const audioAsset = getAudioAsset(db, input.audioAssetId);

  if (input.audioAssetId && (!audioAsset || audioAsset.kind !== 'audio' || !audioAsset.isActive)) {
    throw new SettingsServiceError(
      'INVALID_SETTINGS',
      'Audio asset must reference an active uploaded audio file.',
      400,
    );
  }

  const poolCounts = getActivePoolCounts(db);

  if (poolCounts.realCount < input.totalRounds) {
    throw new SettingsServiceError(
      'INVALID_SETTINGS',
      `At least ${input.totalRounds} active real assets are required.`,
      400,
    );
  }

  if (poolCounts.aiCount < 8) {
    throw new SettingsServiceError('INVALID_SETTINGS', 'At least 8 active ai assets are required.', 400);
  }
}

function toPublicAssetUrl(filePath: string | null) {
  return filePath ? `/${filePath}` : DEFAULT_AUDIO_URL;
}

function mapSettings(db: Database.Database, row: SiteSettingsRow): SiteSettings {
  const audioAsset = getAudioAsset(db, row.audioAssetId);

  return {
    ...row,
    audioUrl: toPublicAssetUrl(audioAsset?.filePath ?? null),
  };
}

export function getSiteSettings(input: { db?: Database.Database } = {}): SiteSettings {
  const db = getReadyDatabase(input.db);
  return mapSettings(db, requireSettingsRow(db));
}

export function updateSiteSettings(input: UpdateSiteSettingsInput): SiteSettings {
  const db = getReadyDatabase(input.db);

  validateSettings(db, input);

  const existing = requireSettingsRow(db);

  db.prepare(
    `UPDATE site_settings
     SET displaySiteName = @displaySiteName,
         successRedirectUrl = @successRedirectUrl,
         audioAssetId = @audioAssetId,
         totalRounds = @totalRounds,
         requiredPassCount = @requiredPassCount,
         updatedAt = CURRENT_TIMESTAMP
     WHERE id = @id`,
  ).run({
    id: existing.id,
    displaySiteName: input.displaySiteName.trim(),
    successRedirectUrl: input.successRedirectUrl,
    audioAssetId: input.audioAssetId,
    totalRounds: input.totalRounds,
    requiredPassCount: input.requiredPassCount,
  });

  return getSiteSettings({ db });
}
