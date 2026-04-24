import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

import type Database from 'better-sqlite3';

import { bootstrapDatabase } from '@/src/server/db/bootstrap';
import { getDatabase } from '@/src/server/db/client';

type AdminUserRow = {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

type AdminUser = {
  id: string;
  username: string;
  createdAt: string;
  updatedAt: string;
};

type SeedAdminUserInput = {
  username: string;
  passwordHash: string;
};

type VerifyAdminCredentialsInput = {
  username: string;
  password: string;
};

const SCRYPT_KEY_LENGTH = 64;
const HEX_PATTERN = /^[0-9a-f]+$/i;

export function normalizeAdminUsername(username: string) {
  return username.trim().toLowerCase();
}

function mapAdminUser(row: AdminUserRow): AdminUser {
  return {
    id: row.id,
    username: row.username,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function getReadyDatabase() {
  const db = getDatabase();
  bootstrapDatabase(db);
  return db;
}

function getAdminUserByUsername(db: Database.Database, username: string) {
  return db
    .prepare(
      `SELECT id, username, passwordHash, createdAt, updatedAt
       FROM admin_users
       WHERE username = ?
       LIMIT 1`,
    )
    .get(normalizeAdminUsername(username)) as AdminUserRow | undefined;
}

export function hashAdminPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString('hex');

  return `scrypt$${salt}$${derivedKey}`;
}

export function verifyAdminPassword(password: string, passwordHash: string) {
  const [algorithm, salt, storedHash] = passwordHash.split('$');

  if (algorithm !== 'scrypt' || !salt || !storedHash) {
    return false;
  }

  if (storedHash.length === 0 || storedHash.length % 2 !== 0 || !HEX_PATTERN.test(storedHash)) {
    return false;
  }

  const expectedHash = Buffer.from(storedHash, 'hex');

  if (expectedHash.length === 0) {
    return false;
  }

  const actualHash = scryptSync(password, salt, expectedHash.length);

  return timingSafeEqual(actualHash, expectedHash);
}

export function upsertAdminUser(db: Database.Database, input: SeedAdminUserInput) {
  db.prepare(
    `INSERT INTO admin_users (id, username, passwordHash)
     VALUES (@id, @username, @passwordHash)
     ON CONFLICT(username) DO UPDATE SET
       passwordHash = excluded.passwordHash,
       updatedAt = CURRENT_TIMESTAMP`,
  ).run({
    id: randomUUID(),
    username: normalizeAdminUsername(input.username),
    passwordHash: input.passwordHash,
  });
}

export function seedAdminUser(
  db: Database.Database,
  username: string,
  password: string,
) {
  upsertAdminUser(db, {
    username,
    passwordHash: hashAdminPassword(password),
  });
}

export async function verifyAdminCredentials(
  db: Database.Database,
  input: VerifyAdminCredentialsInput,
) {
  const adminUser = getAdminUserByUsername(db, input.username);

  if (!adminUser) {
    return null;
  }

  if (!verifyAdminPassword(input.password, adminUser.passwordHash)) {
    return null;
  }

  return mapAdminUser(adminUser);
}

export async function authenticateAdmin(input: VerifyAdminCredentialsInput) {
  return verifyAdminCredentials(getReadyDatabase(), input);
}
