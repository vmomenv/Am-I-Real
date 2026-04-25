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

function selectAiWindow(
  aiAssets: AssetRow[],
  usageCountById: Map<string, number>,
  lastUsedRoundById: Map<string, number>,
  orderIndexById: Map<string, number>,
) {
  const selectedAiAssets = [...aiAssets]
    .sort((left, right) => {
      const leftUsage = usageCountById.get(left.id) ?? 0;
      const rightUsage = usageCountById.get(right.id) ?? 0;

      if (leftUsage !== rightUsage) {
        return leftUsage - rightUsage;
      }

      const leftLastUsed = lastUsedRoundById.get(left.id) ?? -1;
      const rightLastUsed = lastUsedRoundById.get(right.id) ?? -1;

      if (leftLastUsed !== rightLastUsed) {
        return leftLastUsed - rightLastUsed;
      }

      return (orderIndexById.get(left.id) ?? 0) - (orderIndexById.get(right.id) ?? 0);
    })
    .slice(0, 8);

  return selectedAiAssets;
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
  const usageCountById = new Map<string, number>();
  const lastUsedRoundById = new Map<string, number>();
  const orderIndexById = new Map(aiAssets.map((asset, index) => [asset.id, index]));

  assertPoolSizes(realAssets, aiAssets, input.totalRounds);

  return Array.from({ length: input.totalRounds }, (_, roundIndex) => {
    const realAsset = realAssets[roundIndex];
    const aiWindow = selectAiWindow(aiAssets, usageCountById, lastUsedRoundById, orderIndexById);

    for (const aiAsset of aiWindow) {
      usageCountById.set(aiAsset.id, (usageCountById.get(aiAsset.id) ?? 0) + 1);
      lastUsedRoundById.set(aiAsset.id, roundIndex);
    }

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
