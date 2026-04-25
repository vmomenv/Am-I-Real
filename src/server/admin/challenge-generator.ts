import type Database from 'better-sqlite3';

import type { InternalRound } from '@/src/lib/challenge-types';
import { bootstrapDatabase } from '@/src/server/db/bootstrap';
import { getDatabase } from '@/src/server/db/client';

type AssetRow = {
  id: string;
  filePath: string;
};

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

function refillAiQueue(queue: AssetRow[], aiAssets: AssetRow[], rng: () => number) {
  const queuedIds = new Set(queue.map((asset) => asset.id));
  const nextCycle = shuffleAssets(aiAssets, rng).filter((asset) => !queuedIds.has(asset.id));

  queue.push(...nextCycle);
}

function selectAiWindow(aiQueue: AssetRow[], aiAssets: AssetRow[], rng: () => number) {
  while (aiQueue.length < 8) {
    refillAiQueue(aiQueue, aiAssets, rng);
  }

  return aiQueue.splice(0, 8);
}

function toPublicAssetUrl(filePath: string) {
  return `/${filePath.replace(/\\/g, '/')}`;
}

function getRealPosition(rng: () => number) {
  return Math.floor(rng() * 9);
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
  const aiQueue = [...aiAssets];

  assertPoolSizes(realAssets, aiAssets, input.totalRounds);

  return Array.from({ length: input.totalRounds }, (_, roundIndex) => {
    const realAsset = realAssets[roundIndex];
    const aiWindow = selectAiWindow(aiQueue, aiAssets, rng);

    const realPosition = getRealPosition(rng);
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
