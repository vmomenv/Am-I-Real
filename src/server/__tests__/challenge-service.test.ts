import {
  getPublicConfig,
  resetChallengeSessions,
  startChallengeSession,
  submitChallengeAnswer,
} from '@/src/server/challenge-service';
import { MOCK_ROUNDS } from '@/src/server/mock-question-bank';

function getWrongOptionId(roundIndex: number) {
  const round = MOCK_ROUNDS[roundIndex];
  return round.options.find((option) => option.id !== round.correctOptionId)?.id ?? '';
}

describe('challenge-service', () => {
  beforeEach(() => {
    resetChallengeSessions();
  });

  it('returns the approved public config', () => {
    expect(getPublicConfig()).toMatchObject({
      brandName: 'Groundflare',
      displaySiteName: 'www.spark-app.store',
      successRedirectUrl: 'https://www.spark-app.store',
      audioUrl: '/1.mp3',
      totalRounds: 10,
      requiredPassCount: 7,
    });
  });

  it('starts a session with a 9-image first round and no scoring metadata in the public payload', () => {
    const started = startChallengeSession();

    expect(started.sessionId).toBeTruthy();
    expect(started.currentRoundIndex).toBe(1);
    expect(started.round.options).toHaveLength(9);
    expect(started.round).not.toHaveProperty('correctOptionId');
  });

  it('fails on the fourth wrong answer', () => {
    const started = startChallengeSession();

    let roundId = started.round.roundId;
    const sessionId = started.sessionId;

    for (let roundIndex = 0; roundIndex < 4; roundIndex += 1) {
      const response = submitChallengeAnswer({
        sessionId,
        roundId,
        selectedOptionId: getWrongOptionId(roundIndex),
      });

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
  });

  it('passes immediately on the seventh correct answer', () => {
    const started = startChallengeSession();

    let roundId = started.round.roundId;
    const sessionId = started.sessionId;

    for (let roundIndex = 0; roundIndex < 7; roundIndex += 1) {
      const response = submitChallengeAnswer({
        sessionId,
        roundId,
        selectedOptionId: MOCK_ROUNDS[roundIndex].correctOptionId,
      });

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
  });
});
