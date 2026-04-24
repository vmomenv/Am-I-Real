// @vitest-environment node

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { bootstrapDatabase } from '@/src/server/db/bootstrap';
import { createDatabase } from '@/src/server/db/client';

function insertAsset(
  db: ReturnType<typeof createDatabase>,
  asset: { id: string; kind: 'ai' | 'real'; filePath: string; isActive?: boolean },
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
    ) VALUES (?, ?, ?, ?, 'image/png', NULL, NULL, 128, ?)`,
  ).run(asset.id, asset.kind, asset.filePath, `${asset.id}.png`, asset.isActive === false ? 0 : 1);
}

describe('challenge-generator', () => {
  let tempDirectory: string;

  beforeEach(async () => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'groundflare-generator-'));
  });

  afterEach(async () => {
    await rm(tempDirectory, { recursive: true, force: true });
  });

  it('builds a stable 10-round plan with exactly 1 real asset and 8 ai assets per round', async () => {
    const db = createDatabase(join(tempDirectory, 'groundflare.sqlite'));
    bootstrapDatabase(db);

    for (let index = 0; index < 3; index += 1) {
      insertAsset(db, {
        id: `real-${index + 1}`,
        kind: 'real',
        filePath: `uploads/real/real-${index + 1}.png`,
      });
    }

    for (let index = 0; index < 10; index += 1) {
      insertAsset(db, {
        id: `ai-${index + 1}`,
        kind: 'ai',
        filePath: `uploads/ai/ai-${index + 1}.png`,
      });
    }

    const { generateChallengeRounds } = await import('@/src/server/admin/challenge-generator');

    const firstPlan = generateChallengeRounds({ db, totalRounds: 10 });
    const secondPlan = generateChallengeRounds({ db, totalRounds: 10 });

    expect(firstPlan).toEqual(secondPlan);
    expect(firstPlan).toHaveLength(10);

    for (const round of firstPlan) {
      expect(round.options).toHaveLength(9);
      expect(round.options.filter((option) => option.id === round.correctOptionId)).toHaveLength(1);
      expect(round.options.filter((option) => option.id.startsWith('real-'))).toHaveLength(1);
      expect(round.options.filter((option) => option.id.startsWith('ai-'))).toHaveLength(8);
    }

    db.close();
  });

  it('ignores inactive assets and rejects pools that cannot form a round', async () => {
    const db = createDatabase(join(tempDirectory, 'groundflare.sqlite'));
    bootstrapDatabase(db);

    insertAsset(db, {
      id: 'real-inactive',
      kind: 'real',
      filePath: 'uploads/real/real-inactive.png',
      isActive: false,
    });

    for (let index = 0; index < 7; index += 1) {
      insertAsset(db, {
        id: `ai-${index + 1}`,
        kind: 'ai',
        filePath: `uploads/ai/ai-${index + 1}.png`,
      });
    }

    const { ChallengeGeneratorError, generateChallengeRounds } = await import(
      '@/src/server/admin/challenge-generator'
    );

    expect(() => generateChallengeRounds({ db, totalRounds: 10 })).toThrowError(
      ChallengeGeneratorError,
    );

    db.close();
  });
});
