import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

import type Database from 'better-sqlite3';

import { bootstrapDatabase } from '@/src/server/db/bootstrap';
import { getDatabase } from '@/src/server/db/client';
import { storeUploadedFile } from '@/src/server/storage/file-storage';

export type AssetKind = 'ai' | 'real' | 'audio';

type AssetRow = {
  id: string;
  kind: AssetKind;
  filePath: string;
  originalFilename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  fileSize: number;
  isActive: number;
  createdAt: string;
  updatedAt: string;
};

export type Asset = Omit<AssetRow, 'isActive'> & {
  isActive: boolean;
};

type AssetErrorCode = 'ASSET_IN_USE' | 'INVALID_FILE_TYPE' | 'INVALID_REQUEST' | 'NOT_FOUND';

export class AssetServiceError extends Error {
  constructor(
    readonly code: AssetErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AssetServiceError';
  }
}

type UploadAssetInput = {
  db?: Database.Database;
  uploadsDir?: string;
  kind: AssetKind;
  file: File;
};

type ListAssetsInput = {
  db?: Database.Database;
  kind?: AssetKind;
  query?: string;
  isActive?: boolean;
};

type UpdateAssetInput = {
  db?: Database.Database;
  id: string;
  isActive: boolean;
};

type RemoveAssetInput = {
  db?: Database.Database;
  id: string;
};

const ALLOWED_MIME_TYPES: Record<AssetKind, Set<string>> = {
  ai: new Set(['image/jpeg', 'image/png', 'image/webp']),
  real: new Set(['image/jpeg', 'image/png', 'image/webp']),
  audio: new Set(['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-wav']),
};

function getReadyDatabase(db = getDatabase()) {
  bootstrapDatabase(db);
  return db;
}

function getUploadsDirectory(uploadsDir?: string) {
  return resolve(uploadsDir ?? process.env.GROUNDFLARE_UPLOADS_DIR ?? 'uploads');
}

function mapAsset(row: AssetRow): Asset {
  return {
    ...row,
    isActive: Boolean(row.isActive),
  };
}

function getAssetById(db: Database.Database, id: string) {
  return db
    .prepare(
      `SELECT id, kind, filePath, originalFilename, mimeType, width, height, fileSize, isActive, createdAt, updatedAt
       FROM image_assets
       WHERE id = ?
       LIMIT 1`,
    )
    .get(id) as AssetRow | undefined;
}

function requireAsset(db: Database.Database, id: string) {
  const asset = getAssetById(db, id);

  if (!asset) {
    throw new AssetServiceError('NOT_FOUND', 'Asset not found.', 404);
  }

  return asset;
}

function ensureAssetIsNotReferencedBySettings(db: Database.Database, assetId: string) {
  const referencedSettings = db
    .prepare('SELECT id FROM site_settings WHERE audioAssetId = ? LIMIT 1')
    .get(assetId) as { id: string } | undefined;

  if (referencedSettings) {
    throw new AssetServiceError('ASSET_IN_USE', 'Asset is still referenced by site settings.', 409);
  }
}

function validateMimeType(kind: AssetKind, file: File) {
  if (!ALLOWED_MIME_TYPES[kind].has(file.type)) {
    throw new AssetServiceError('INVALID_FILE_TYPE', 'Invalid file type for this asset kind.', 400);
  }
}

export async function uploadAsset(input: UploadAssetInput) {
  const db = getReadyDatabase(input.db);

  validateMimeType(input.kind, input.file);

  const storedFile = await storeUploadedFile({
    uploadsDir: getUploadsDirectory(input.uploadsDir),
    kind: input.kind,
    file: input.file,
  });

  const id = randomUUID();

  db.prepare(
    `INSERT INTO image_assets (
      id,
      kind,
      filePath,
      originalFilename,
      mimeType,
      width,
      height,
      fileSize
    ) VALUES (
      @id,
      @kind,
      @filePath,
      @originalFilename,
      @mimeType,
      @width,
      @height,
      @fileSize
    )`,
  ).run({
    id,
    kind: input.kind,
    filePath: storedFile.filePath,
    originalFilename: input.file.name,
    mimeType: input.file.type,
    width: null,
    height: null,
    fileSize: storedFile.fileSize,
  });

  return mapAsset(requireAsset(db, id));
}

export function listAssets(input: ListAssetsInput = {}) {
  const db = getReadyDatabase(input.db);
  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (input.kind) {
    conditions.push('kind = ?');
    params.push(input.kind);
  }

  if (input.query?.trim()) {
    conditions.push('(originalFilename LIKE ? OR id LIKE ?)');
    params.push(`%${input.query.trim()}%`, `%${input.query.trim()}%`);
  }

  if (typeof input.isActive === 'boolean') {
    conditions.push('isActive = ?');
    params.push(input.isActive ? 1 : 0);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return (
    db
      .prepare(
        `SELECT id, kind, filePath, originalFilename, mimeType, width, height, fileSize, isActive, createdAt, updatedAt
         FROM image_assets
         ${whereClause}
         ORDER BY datetime(createdAt) DESC, rowid DESC`,
      )
      .all(...params) as AssetRow[]
  ).map(mapAsset);
}

export function updateAsset(input: UpdateAssetInput) {
  const db = getReadyDatabase(input.db);

  const asset = requireAsset(db, input.id);

  if (asset.kind === 'audio' && !input.isActive) {
    ensureAssetIsNotReferencedBySettings(db, input.id);
  }

  db.prepare(
    `UPDATE image_assets
     SET isActive = @isActive,
         updatedAt = CURRENT_TIMESTAMP
     WHERE id = @id`,
  ).run({
    id: input.id,
    isActive: input.isActive ? 1 : 0,
  });

  return mapAsset(requireAsset(db, input.id));
}

export async function removeAsset(input: RemoveAssetInput) {
  const db = getReadyDatabase(input.db);

  requireAsset(db, input.id);

  ensureAssetIsNotReferencedBySettings(db, input.id);

  return updateAsset({
    db,
    id: input.id,
    isActive: false,
  });
}
