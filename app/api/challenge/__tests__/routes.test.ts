// @vitest-environment node

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { bootstrapDatabase } from '@/src/server/db/bootstrap';
import { createDatabase } from '@/src/server/db/client';
import { vi } from 'vitest';

function insertAsset(
  db: ReturnType<typeof createDatabase>,
  asset: { id: string; kind: 'ai' | 'real'; filePath: string },
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
    ) VALUES (?, ?, ?, ?, 'image/png', NULL, NULL, 128, 1)`,
  ).run(asset.id, asset.kind, asset.filePath, `${asset.id}.png`);
}

async function loadChallengeModules() {
  vi.resetModules();

  return Promise.all([
    import('@/app/api/challenge/config/route'),
    import('@/app/api/challenge/start/route'),
    import('@/app/api/challenge/answer/route'),
    import('@/src/server/challenge-service'),
  ]);
}

describe('challenge api routes', () => {
  let tempDirectory: string;
  let dbPath: string;

  beforeEach(async () => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'groundflare-routes-'));
    dbPath = join(tempDirectory, 'groundflare.sqlite');
    process.env.GROUNDFLARE_DB_PATH = dbPath;

    const db = createDatabase(dbPath);
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

    db.close();
  });

  afterEach(async () => {
    delete process.env.GROUNDFLARE_DB_PATH;
    await rm(tempDirectory, { recursive: true, force: true });
  });

  it('returns the public config payload', async () => {
    const [{ GET: getConfig }, , , { getPublicConfig }] = await loadChallengeModules();
    const response = await getConfig();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(getPublicConfig());
  });

  it('supports a start to answer flow through the route handlers', async () => {
    const [, { POST: startChallenge }, { POST: answerChallenge }] = await loadChallengeModules();
    const startResponse = await startChallenge();
    const started = await startResponse.json();

    const db = createDatabase(dbPath);
    const stored = db
      .prepare('SELECT roundPlanJson FROM challenge_sessions WHERE id = ?')
      .get(started.sessionId) as { roundPlanJson: string };
    const roundPlan = JSON.parse(stored.roundPlanJson) as Array<{ correctOptionId: string }>;

    db.close();

    expect(startResponse.status).toBe(200);
    expect(started).toEqual(
      expect.objectContaining({
        sessionId: expect.any(String),
        currentRoundIndex: 1,
      }),
    );

    const answerResponse = await answerChallenge(
      new Request('http://localhost/api/challenge/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: started.sessionId,
          roundId: started.round.roundId,
          selectedOptionId: roundPlan[0].correctOptionId,
        }),
      }),
    );

    expect(answerResponse.status).toBe(200);
    await expect(answerResponse.json()).resolves.toEqual(
      expect.objectContaining({
        status: 'continue',
        correctCount: 1,
        mistakeCount: 0,
        currentRoundIndex: 2,
      }),
      );
  });

  it('returns a controlled failure when the active pool cannot satisfy current settings', async () => {
    const [, { POST: startChallenge }] = await loadChallengeModules();
    const db = createDatabase(dbPath);

    db.prepare("UPDATE image_assets SET isActive = 0 WHERE kind = 'real' AND id = ?").run('real-10');
    db.close();

    const response = await startChallenge();

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      code: 'INVALID_CHALLENGE_POOL',
      message: 'The active challenge asset pool does not satisfy current site settings.',
    });
  });
});
