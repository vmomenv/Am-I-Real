// @vitest-environment node

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { bootstrapDatabase } from '@/src/server/db/bootstrap';
import { createDatabase } from '@/src/server/db/client';
import type { InternalRound } from '@/src/lib/challenge-types';

describe('challenge-sessions-service', () => {
  let tempDirectory: string;

  beforeEach(async () => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'groundflare-sessions-'));
  });

  afterEach(async () => {
    await rm(tempDirectory, { recursive: true, force: true });
  });

  it('creates sessions with persisted round plans and default lifecycle counters', async () => {
    const db = createDatabase(join(tempDirectory, 'groundflare.sqlite'));
    bootstrapDatabase(db);

    const { createChallengeSession } = await import('@/src/server/admin/challenge-sessions-service');

    const roundPlan: InternalRound[] = [
      {
        roundId: 'round-1',
        prompt: '请选择唯一真实照片',
        correctOptionId: 'real-1',
        options: Array.from({ length: 9 }, (_, index) => ({
          id: index === 0 ? 'real-1' : `ai-${index}`,
          imageUrl: `/asset-${index}.png`,
          alt: `Round 1 option ${index + 1}`,
        })),
      },
    ];

    const session = createChallengeSession({ db, roundPlan });

    expect(session).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        status: 'active',
        currentRoundIndex: 0,
        correctCount: 0,
        mistakeCount: 0,
        roundPlan,
      }),
    );

    const stored = db
      .prepare(
        'SELECT status, currentRoundIndex, correctCount, mistakeCount, roundPlanJson FROM challenge_sessions WHERE id = ?',
      )
      .get(session.id) as {
      status: string;
      currentRoundIndex: number;
      correctCount: number;
      mistakeCount: number;
      roundPlanJson: string;
    };

    expect(stored).toEqual({
      status: 'active',
      currentRoundIndex: 0,
      correctCount: 0,
      mistakeCount: 0,
      roundPlanJson: JSON.stringify(roundPlan),
    });

    db.close();
  });

  it('lists persisted sessions and supports lifecycle updates', async () => {
    const db = createDatabase(join(tempDirectory, 'groundflare.sqlite'));
    bootstrapDatabase(db);

    const { createChallengeSession, getChallengeSession, listChallengeSessions, saveChallengeSession } =
      await import('@/src/server/admin/challenge-sessions-service');

    const created = createChallengeSession({
      db,
      roundPlan: [
        {
          roundId: 'round-1',
          prompt: '请选择唯一真实照片',
          correctOptionId: 'real-1',
          options: Array.from({ length: 9 }, (_, index) => ({
            id: index === 0 ? 'real-1' : `ai-${index}`,
            imageUrl: `/asset-${index}.png`,
            alt: `Round 1 option ${index + 1}`,
          })),
        },
      ],
    });

    saveChallengeSession({
      db,
      session: {
        ...created,
        status: 'failed',
        currentRoundIndex: 3,
        correctCount: 2,
        mistakeCount: 4,
      },
    });

    expect(getChallengeSession({ db, id: created.id })).toEqual(
      expect.objectContaining({
        id: created.id,
        status: 'failed',
        currentRoundIndex: 3,
        correctCount: 2,
        mistakeCount: 4,
      }),
    );

    expect(listChallengeSessions({ db })).toEqual([
      expect.objectContaining({
        id: created.id,
        status: 'failed',
        correctCount: 2,
        mistakeCount: 4,
      }),
    ]);

    db.close();
  });
});
