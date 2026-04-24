// @vitest-environment node

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { bootstrapDatabase } from '@/src/server/db/bootstrap';
import { createDatabase } from '@/src/server/db/client';

describe('auth-service', () => {
  let tempDirectory: string;

  beforeEach(async () => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'groundflare-admin-auth-'));
  });

  afterEach(async () => {
    await rm(tempDirectory, { recursive: true, force: true });
  });

  it('accepts the correct password and rejects an incorrect password', async () => {
    const db = createDatabase(join(tempDirectory, 'groundflare.sqlite'));
    bootstrapDatabase(db);

    const {
      hashAdminPassword,
      upsertAdminUser,
      verifyAdminCredentials,
    } = await import('@/src/server/admin/auth-service');

    upsertAdminUser(db, {
      username: 'admin',
      passwordHash: hashAdminPassword('correct-horse-battery-staple'),
    });

    await expect(
      verifyAdminCredentials(db, {
        username: 'admin',
        password: 'correct-horse-battery-staple',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        username: 'admin',
      }),
    );

    await expect(
      verifyAdminCredentials(db, {
        username: 'admin',
        password: 'wrong-password',
      }),
    ).resolves.toBeNull();

    db.close();
  });

  it('seeds an admin user from username and password input', async () => {
    const db = createDatabase(join(tempDirectory, 'groundflare.sqlite'));
    bootstrapDatabase(db);

    const { seedAdminUser, verifyAdminCredentials } = await import(
      '@/src/server/admin/auth-service'
    );

    seedAdminUser(db, 'seeded-admin', 'plan-aligned-password');

    await expect(
      verifyAdminCredentials(db, {
        username: 'seeded-admin',
        password: 'plan-aligned-password',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        username: 'seeded-admin',
      }),
    );

    db.close();
  });

  it('rejects malformed stored password hashes', async () => {
    const { verifyAdminPassword } = await import('@/src/server/admin/auth-service');

    expect(verifyAdminPassword('correct-horse-battery-staple', 'scrypt$salt$zz')).toBe(false);
  });
});
