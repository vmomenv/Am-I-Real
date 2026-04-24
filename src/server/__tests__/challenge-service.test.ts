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

function getCorrectPosition(round: { correctOptionId: string; options: Array<{ id: string }> }) {
  return round.options.findIndex((option) => option.id === round.correctOptionId);
}

describe('challenge-service', () => {
  let tempDirectory: string;

  function createSequenceRng(values: number[]) {
    let index = 0;

    return () => {
      const value = values[index] ?? values[values.length - 1] ?? 0;
      index += 1;
      return value;
    };
  }

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

    for (let index = 0; index < 10; index += 1) {
      insertAsset(db, {
        id: `real-${index + 1}`,
        kind: 'real',
        filePath: `uploads/real/real-${index + 1}.png`,
      });
    }

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
    expect(
      new Set(
        (JSON.parse(persisted.roundPlanJson) as InternalRound[]).map((round) => round.correctOptionId),
      ).size,
    ).toBe(10);

    db.close();
  });

  it('persists each session snapshot after creation even when later sessions randomize differently', () => {
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

    const firstSession = startChallengeSession({
      db,
      rng: createSequenceRng([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    });
    const firstPlanBefore = getStoredRoundPlan(db, firstSession.sessionId);

    const secondSession = startChallengeSession({
      db,
      rng: createSequenceRng([
        0.91, 0.82, 0.73, 0.64, 0.55, 0.46, 0.37, 0.28, 0.19, 0.1, 0.93, 0.84, 0.75, 0.66,
        0.57, 0.48, 0.39, 0.3, 0.21, 0.12,
      ]),
    });
    const firstPlanAfter = getStoredRoundPlan(db, firstSession.sessionId);
    const secondPlan = getStoredRoundPlan(db, secondSession.sessionId);

    expect(firstPlanAfter).toEqual(firstPlanBefore);
    expect(secondPlan).not.toEqual(firstPlanBefore);

    const continueResponse = submitChallengeAnswer(
      {
        sessionId: firstSession.sessionId,
        roundId: firstSession.round.roundId,
        selectedOptionId: firstPlanBefore[0].correctOptionId,
      },
      { db },
    );

    expect(continueResponse).toEqual(
      expect.objectContaining({
        status: 'continue',
        correctCount: 1,
      }),
    );

    db.close();
  });

  it('uses the session snapshot contract after start even if site settings change later', () => {
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

    const started = startChallengeSession({
      db,
      rng: createSequenceRng([
        0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95, 0.14, 0.24, 0.34, 0.44, 0.54,
        0.64, 0.74, 0.84, 0.94, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.11,
      ]),
    });
    const roundPlan = getStoredRoundPlan(db, started.sessionId);

    db.prepare(
      `UPDATE site_settings
       SET successRedirectUrl = ?, requiredPassCount = ?, totalRounds = ?
       WHERE id = ?`,
    ).run('https://drifted.example', 10, 10, 'default');

    let roundId = started.round.roundId;

    for (let roundIndex = 0; roundIndex < 7; roundIndex += 1) {
      const response = submitChallengeAnswer(
        {
          sessionId: started.sessionId,
          roundId,
          selectedOptionId: roundPlan[roundIndex].correctOptionId,
        },
        { db },
      );

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

    db.close();
  });

  it('randomizes correct-option placement per session instead of using one fixed position pattern', () => {
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

    const sharedShufflePrefix = [
      0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95, 0.14, 0.24, 0.34, 0.44, 0.54,
      0.64, 0.74, 0.84, 0.94,
    ];

    const firstSession = startChallengeSession({
      db,
      rng: createSequenceRng([...sharedShufflePrefix, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    });
    const secondSession = startChallengeSession({
      db,
      rng: createSequenceRng([
        ...sharedShufflePrefix,
        0.99, 0.88, 0.77, 0.66, 0.55, 0.44, 0.33, 0.22, 0.11, 0.5,
      ]),
    });

    const firstPlan = getStoredRoundPlan(db, firstSession.sessionId);
    const secondPlan = getStoredRoundPlan(db, secondSession.sessionId);

    expect(firstPlan.map((round) => round.correctOptionId)).toEqual(
      secondPlan.map((round) => round.correctOptionId),
    );
    expect(firstPlan.map(getCorrectPosition)).not.toEqual(secondPlan.map(getCorrectPosition));

    db.close();
  });

  it('fails on the fourth wrong answer', () => {
    const db = createDatabase(join(tempDirectory, 'groundflare.sqlite'));
    bootstrapDatabase(db);

    for (let index = 0; index < 10; index += 1) {
      insertAsset(db, {
        id: `real-${index + 1}`,
        kind: 'real',
        filePath: `uploads/real/real-${index + 1}.png`,
      });
    }

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

    for (let index = 0; index < 10; index += 1) {
      insertAsset(db, {
        id: `real-${index + 1}`,
        kind: 'real',
        filePath: `uploads/real/real-${index + 1}.png`,
      });
    }

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
