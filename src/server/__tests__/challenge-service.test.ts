// @vitest-environment node

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { bootstrapDatabase } from '@/src/server/db/bootstrap';
import { createDatabase } from '@/src/server/db/client';
import {
  getPublicConfig,
  startChallengeSession,
  submitChallengeAnswer,
} from '@/src/server/challenge-service';
import type { InternalRound } from '@/src/lib/challenge-types';

function insertAsset(
  db: ReturnType<typeof createDatabase>,
  asset: { id: string; kind: 'ai' | 'real' | 'audio'; filePath: string; isActive?: boolean },
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
    ) VALUES (?, ?, ?, ?, ?, NULL, NULL, 128, ?)`,
  ).run(
    asset.id,
    asset.kind,
    asset.filePath,
    `${asset.id}.bin`,
    asset.kind === 'audio' ? 'audio/mpeg' : 'image/png',
    asset.isActive === false ? 0 : 1,
  );
}

function getStoredRoundPlan(db: ReturnType<typeof createDatabase>, sessionId: string) {
  const row = db
    .prepare('SELECT roundPlanJson FROM challenge_sessions WHERE id = ?')
    .get(sessionId) as { roundPlanJson: string };

  return JSON.parse(row.roundPlanJson) as InternalRound[];
}

describe('challenge-service', () => {
  let tempDirectory: string;

  beforeEach(async () => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'groundflare-challenge-'));
  });

  afterEach(async () => {
    await rm(tempDirectory, { recursive: true, force: true });
  });

  it('returns the approved public config', () => {
    const db = createDatabase(join(tempDirectory, 'groundflare.sqlite'));
    bootstrapDatabase(db);

    expect(getPublicConfig({ db })).toMatchObject({
      brandName: 'Groundflare',
      displaySiteName: 'www.spark-app.store',
      successRedirectUrl: 'https://www.spark-app.store',
      audioUrl: '/1.mp3',
      totalRounds: 10,
      requiredPassCount: 7,
    });

    db.close();
  });

  it('starts a persisted session with a 9-image first round and no scoring metadata in the public payload', () => {
    const db = createDatabase(join(tempDirectory, 'groundflare.sqlite'));
    bootstrapDatabase(db);

    insertAsset(db, { id: 'real-1', kind: 'real', filePath: 'uploads/real/real-1.png' });
    insertAsset(db, { id: 'real-2', kind: 'real', filePath: 'uploads/real/real-2.png' });

    for (let index = 0; index < 8; index += 1) {
      insertAsset(db, {
        id: `ai-${index + 1}`,
        kind: 'ai',
        filePath: `uploads/ai/ai-${index + 1}.png`,
      });
    }

    const started = startChallengeSession({ db });

    expect(started.sessionId).toBeTruthy();
    expect(started.currentRoundIndex).toBe(1);
    expect(started.round.options).toHaveLength(9);
    expect(started.round).not.toHaveProperty('correctOptionId');

    const persisted = db
      .prepare(
        'SELECT status, currentRoundIndex, correctCount, mistakeCount, roundPlanJson FROM challenge_sessions WHERE id = ?',
      )
      .get(started.sessionId) as {
      status: string;
      currentRoundIndex: number;
      correctCount: number;
      mistakeCount: number;
      roundPlanJson: string;
    };

    expect(persisted.status).toBe('active');
    expect(persisted.currentRoundIndex).toBe(0);
    expect(persisted.correctCount).toBe(0);
    expect(persisted.mistakeCount).toBe(0);
    expect(JSON.parse(persisted.roundPlanJson)).toHaveLength(10);

    db.close();
  });

  it('fails on the fourth wrong answer', () => {
    const db = createDatabase(join(tempDirectory, 'groundflare.sqlite'));
    bootstrapDatabase(db);

    insertAsset(db, { id: 'real-1', kind: 'real', filePath: 'uploads/real/real-1.png' });

    for (let index = 0; index < 8; index += 1) {
      insertAsset(db, {
        id: `ai-${index + 1}`,
        kind: 'ai',
        filePath: `uploads/ai/ai-${index + 1}.png`,
      });
    }

    const started = startChallengeSession({ db });
    const roundPlan = getStoredRoundPlan(db, started.sessionId);

    let roundId = started.round.roundId;
    const sessionId = started.sessionId;

    for (let roundIndex = 0; roundIndex < 4; roundIndex += 1) {
      const wrongOptionId =
        roundPlan[roundIndex].options.find(
          (option) => option.id !== roundPlan[roundIndex].correctOptionId,
        )?.id ?? '';
      const response = submitChallengeAnswer({
        sessionId,
        roundId,
        selectedOptionId: wrongOptionId,
      }, { db });

      if (roundIndex < 3) {
        expect(response.status).toBe('continue');
        if (response.status === 'continue') {
          roundId = response.round.roundId;
        }
      } else {
        expect(response).toEqual(
          expect.objectContaining({
            status: 'failed',
            mistakeCount: 4,
            message: '你不是人类！',
          }),
        );
      }
    }

    expect(
      db.prepare('SELECT status, mistakeCount FROM challenge_sessions WHERE id = ?').get(sessionId),
    ).toEqual(
      expect.objectContaining({
        status: 'failed',
        mistakeCount: 4,
      }),
    );

    db.close();
  });

  it('passes immediately on the seventh correct answer', () => {
    const db = createDatabase(join(tempDirectory, 'groundflare.sqlite'));
    bootstrapDatabase(db);

    insertAsset(db, { id: 'real-1', kind: 'real', filePath: 'uploads/real/real-1.png' });
    insertAsset(db, { id: 'real-2', kind: 'real', filePath: 'uploads/real/real-2.png' });

    for (let index = 0; index < 8; index += 1) {
      insertAsset(db, {
        id: `ai-${index + 1}`,
        kind: 'ai',
        filePath: `uploads/ai/ai-${index + 1}.png`,
      });
    }

    const started = startChallengeSession({ db });
    const roundPlan = getStoredRoundPlan(db, started.sessionId);

    let roundId = started.round.roundId;
    const sessionId = started.sessionId;

    for (let roundIndex = 0; roundIndex < 7; roundIndex += 1) {
      const response = submitChallengeAnswer({
        sessionId,
        roundId,
        selectedOptionId: roundPlan[roundIndex].correctOptionId,
      }, { db });

      if (roundIndex < 6) {
        expect(response.status).toBe('continue');
        if (response.status === 'continue') {
          roundId = response.round.roundId;
        }
      } else {
        expect(response).toEqual(
          expect.objectContaining({
            status: 'passed',
            correctCount: 7,
            redirectUrl: 'https://www.spark-app.store',
          }),
        );
      }
    }

    expect(
      db.prepare('SELECT status, correctCount FROM challenge_sessions WHERE id = ?').get(sessionId),
    ).toEqual(
      expect.objectContaining({
        status: 'passed',
        correctCount: 7,
      }),
    );

    db.close();
  });
});
