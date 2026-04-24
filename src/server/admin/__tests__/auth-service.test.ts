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
});
