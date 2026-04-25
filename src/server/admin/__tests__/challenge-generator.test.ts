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

  function createSequenceRng(values: number[]) {
    let index = 0;

    return () => {
      const value = values[index] ?? values[values.length - 1] ?? 0;
      index += 1;
      return value;
    };
  }

  function getCorrectPosition(round: { correctOptionId: string; options: Array<{ id: string }> }) {
    return round.options.findIndex((option) => option.id === round.correctOptionId);
  }

  beforeEach(async () => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'groundflare-generator-'));
  });

  afterEach(async () => {
    await rm(tempDirectory, { recursive: true, force: true });
  });

  it('builds a valid per-session plan and allows different sessions to randomize differently', async () => {
    const db = createDatabase(join(tempDirectory, 'groundflare.sqlite'));
    bootstrapDatabase(db);

    for (let index = 0; index < 10; index += 1) {
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

    const { createChallengePlan } = await import('@/src/server/admin/challenge-generator');

    const firstPlan = createChallengePlan({
      db,
      totalRounds: 10,
      rng: createSequenceRng([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    });
    const secondPlan = createChallengePlan({
      db,
      totalRounds: 10,
      rng: createSequenceRng([
        0.91, 0.82, 0.73, 0.64, 0.55, 0.46, 0.37, 0.28, 0.19, 0.1, 0.93, 0.84, 0.75, 0.66,
        0.57, 0.48, 0.39, 0.3, 0.21, 0.12,
      ]),
    });

    expect(firstPlan).toHaveLength(10);
    expect(secondPlan).toHaveLength(10);
    expect(firstPlan).not.toEqual(secondPlan);
    expect(new Set(firstPlan.map((round) => round.correctOptionId)).size).toBe(10);
    expect(new Set(secondPlan.map((round) => round.correctOptionId)).size).toBe(10);

    for (const plan of [firstPlan, secondPlan]) {
      for (const round of plan) {
        expect(round.options).toHaveLength(9);
        expect(round.options.filter((option) => option.id === round.correctOptionId)).toHaveLength(1);
        expect(round.options.filter((option) => option.id.startsWith('real-'))).toHaveLength(1);
        expect(round.options.filter((option) => option.id.startsWith('ai-'))).toHaveLength(8);
        expect(new Set(round.options.filter((option) => option.id.startsWith('ai-')).map((option) => option.id)).size).toBe(8);
      }
    }

    db.close();
  });

  it('prioritizes unseen ai assets in the next round before repeating seen ones', async () => {
    const db = createDatabase(join(tempDirectory, 'groundflare.sqlite'));
    bootstrapDatabase(db);

    for (let index = 0; index < 10; index += 1) {
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

    const { createChallengePlan } = await import('@/src/server/admin/challenge-generator');

    const plan = createChallengePlan({
      db,
      totalRounds: 2,
      rng: createSequenceRng(Array.from({ length: 32 }, () => 0.5)),
    });

    const firstRoundAiIds = new Set(
      plan[0].options.filter((option) => option.id.startsWith('ai-')).map((option) => option.id),
    );
    const secondRoundAiIds = plan[1].options
      .filter((option) => option.id.startsWith('ai-'))
      .map((option) => option.id);

    const unseenAiInSecondRound = secondRoundAiIds.filter((id) => !firstRoundAiIds.has(id));

    expect(unseenAiInSecondRound).toHaveLength(2);

    db.close();
  });

  it('randomizes the real-image position per generated session instead of using a fixed round pattern', async () => {
    const db = createDatabase(join(tempDirectory, 'groundflare.sqlite'));
    bootstrapDatabase(db);

    for (let index = 0; index < 10; index += 1) {
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

    const { createChallengePlan } = await import('@/src/server/admin/challenge-generator');

    const sharedShufflePrefix = [
      0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95, 0.14, 0.24, 0.34, 0.44, 0.54,
      0.64, 0.74, 0.84, 0.94,
    ];
    const firstPlan = createChallengePlan({
      db,
      totalRounds: 10,
      rng: createSequenceRng([...sharedShufflePrefix, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    });
    const secondPlan = createChallengePlan({
      db,
      totalRounds: 10,
      rng: createSequenceRng([
        ...sharedShufflePrefix,
        0.99, 0.88, 0.77, 0.66, 0.55, 0.44, 0.33, 0.22, 0.11, 0.5,
      ]),
    });

    expect(firstPlan.map((round) => round.correctOptionId)).toEqual(
      secondPlan.map((round) => round.correctOptionId),
    );
    expect(firstPlan.map(getCorrectPosition)).not.toEqual(secondPlan.map(getCorrectPosition));

    db.close();
  });

  it('ignores inactive assets and rejects sessions without enough unique real assets', async () => {
    const db = createDatabase(join(tempDirectory, 'groundflare.sqlite'));
    bootstrapDatabase(db);

    for (let index = 0; index < 9; index += 1) {
      insertAsset(db, {
        id: `real-${index + 1}`,
        kind: 'real',
        filePath: `uploads/real/real-${index + 1}.png`,
      });
    }

    insertAsset(db, {
      id: 'real-inactive',
      kind: 'real',
      filePath: 'uploads/real/real-inactive.png',
      isActive: false,
    });

    for (let index = 0; index < 8; index += 1) {
      insertAsset(db, {
        id: `ai-${index + 1}`,
        kind: 'ai',
        filePath: `uploads/ai/ai-${index + 1}.png`,
      });
    }

    const { ChallengeGeneratorError, generateChallengeRounds } = await import(
      '@/src/server/admin/challenge-generator'
    );

    expect(() => generateChallengeRounds({ db, totalRounds: 10 })).toThrowError(ChallengeGeneratorError);

    db.close();
  });

  it('rejects pools that cannot form a round because they have fewer than 8 active ai assets', async () => {
    const db = createDatabase(join(tempDirectory, 'groundflare.sqlite'));
    bootstrapDatabase(db);

    for (let index = 0; index < 10; index += 1) {
      insertAsset(db, {
        id: `real-${index + 1}`,
        kind: 'real',
        filePath: `uploads/real/real-${index + 1}.png`,
      });
    }

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

    expect(() => generateChallengeRounds({ db, totalRounds: 10 })).toThrowError(ChallengeGeneratorError);

    db.close();
  });
});
