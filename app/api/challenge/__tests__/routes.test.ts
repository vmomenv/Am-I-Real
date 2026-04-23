import { GET as getConfig } from '@/app/api/challenge/config/route';
import { POST as startChallenge } from '@/app/api/challenge/start/route';
import { POST as answerChallenge } from '@/app/api/challenge/answer/route';
import { getPublicConfig, resetChallengeSessions } from '@/src/server/challenge-service';
import { MOCK_ROUNDS } from '@/src/server/mock-question-bank';

describe('challenge api routes', () => {
  beforeEach(() => {
    resetChallengeSessions();
  });

  it('returns the public config payload', async () => {
    const response = await getConfig();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(getPublicConfig());
  });

  it('supports a start to answer flow through the route handlers', async () => {
    const startResponse = await startChallenge();
    const started = await startResponse.json();

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
          selectedOptionId: MOCK_ROUNDS[0].correctOptionId,
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
});
