import type Database from 'better-sqlite3';

import type { InternalRound } from '@/src/lib/challenge-types';
import { bootstrapDatabase } from '@/src/server/db/bootstrap';
import { getDatabase } from '@/src/server/db/client';

type AssetRow = {
  id: string;
  filePath: string;
};

const REAL_POSITIONS = [1, 4, 7, 2, 8, 0, 5, 3, 6, 4];

export class ChallengeGeneratorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChallengeGeneratorError';
  }
}

function getReadyDatabase(db = getDatabase()) {
  bootstrapDatabase(db);
  return db;
}

function listActiveAssets(db: Database.Database, kind: 'ai' | 'real') {
  return db
    .prepare(
      `SELECT id, filePath
       FROM image_assets
       WHERE kind = ? AND isActive = 1
       ORDER BY datetime(createdAt) ASC, rowid ASC`,
    )
    .all(kind) as AssetRow[];
}

function assertPoolSizes(realAssets: AssetRow[], aiAssets: AssetRow[], totalRounds: number) {
  if (realAssets.length < totalRounds) {
    throw new ChallengeGeneratorError(
      `At least ${totalRounds} active real assets are required to build a session.`,
    );
  }

  if (aiAssets.length < 8) {
    throw new ChallengeGeneratorError('At least 8 active ai assets are required to build a round.');
  }
}

function shuffleAssets<T>(assets: T[], rng: () => number) {
  const shuffled = [...assets];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    const current = shuffled[index];
    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = current;
  }

  return shuffled;
}

function takeStableAiWindow(aiAssets: AssetRow[], roundIndex: number) {
  return Array.from({ length: 8 }, (_, offset) => aiAssets[(roundIndex + offset) % aiAssets.length]);
}

function toPublicAssetUrl(filePath: string) {
  return `/${filePath}`;
}

export function createChallengePlan(input: {
  db?: Database.Database;
  totalRounds: number;
  rng?: () => number;
}) {
  const db = getReadyDatabase(input.db);
  const rng = input.rng ?? Math.random;
  const realAssets = shuffleAssets(listActiveAssets(db, 'real'), rng);
  const aiAssets = shuffleAssets(listActiveAssets(db, 'ai'), rng);

  assertPoolSizes(realAssets, aiAssets, input.totalRounds);

  return Array.from({ length: input.totalRounds }, (_, roundIndex) => {
    const realAsset = realAssets[roundIndex];
    const aiWindow = takeStableAiWindow(aiAssets, roundIndex);
    const realPosition = REAL_POSITIONS[roundIndex % REAL_POSITIONS.length];
    const options = aiWindow.map((asset, optionIndex) => ({
      id: asset.id,
      imageUrl: toPublicAssetUrl(asset.filePath),
      alt: `Round ${roundIndex + 1} candidate ${optionIndex + 1}`,
    }));

    options.splice(realPosition, 0, {
      id: realAsset.id,
      imageUrl: toPublicAssetUrl(realAsset.filePath),
      alt: `Round ${roundIndex + 1} candidate ${realPosition + 1}`,
    });

    return {
      roundId: `round-${roundIndex + 1}`,
      prompt: '请选择唯一真实照片',
      correctOptionId: realAsset.id,
      options,
    } satisfies InternalRound;
  });
}

export function generateChallengeRounds(input: { db?: Database.Database; totalRounds: number }) {
  return createChallengePlan(input);
}
