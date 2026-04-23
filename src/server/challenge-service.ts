import type {
  ChallengeAnswerRequest,
  ChallengeAnswerResponse,
  ChallengeStartResponse,
  InternalRound,
  PublicChallengeConfig,
} from '@/src/lib/challenge-types';
import {
  getChallengeOutcome,
  getRemainingMistakesBeforeFailure,
} from '@/src/lib/challenge-rules';
import {
  MOCK_ROUNDS,
  PUBLIC_CHALLENGE_CONFIG,
  toPublicRound,
} from '@/src/server/mock-question-bank';

interface ChallengeSession {
  sessionId: string;
  rounds: InternalRound[];
  currentRoundIndex: number;
  correctCount: number;
  mistakeCount: number;
}

const sessions = new Map<string, ChallengeSession>();

function cloneRounds() {
  return MOCK_ROUNDS.map((round) => ({
    ...round,
    options: round.options.map((option) => ({ ...option })),
  }));
}

function failResponse(session: ChallengeSession) {
  return {
    status: 'failed' as const,
    correctCount: session.correctCount,
    mistakeCount: session.mistakeCount,
    message: '你不是人类！',
  };
}

function passResponse(session: ChallengeSession) {
  return {
    status: 'passed' as const,
    correctCount: session.correctCount,
    mistakeCount: session.mistakeCount,
    redirectUrl: PUBLIC_CHALLENGE_CONFIG.successRedirectUrl,
  };
}

function expiredResponse() {
  return {
    status: 'expired' as const,
    message: '验证已过期，请重新开始',
  };
}

export function getPublicConfig(): PublicChallengeConfig {
  return PUBLIC_CHALLENGE_CONFIG;
}

export function resetChallengeSessions() {
  sessions.clear();
}

export function startChallengeSession(): ChallengeStartResponse {
  const rounds = cloneRounds();
  const sessionId = crypto.randomUUID();

  const session: ChallengeSession = {
    sessionId,
    rounds,
    currentRoundIndex: 0,
    correctCount: 0,
    mistakeCount: 0,
  };

  sessions.set(sessionId, session);

  return {
    ...PUBLIC_CHALLENGE_CONFIG,
    sessionId,
    currentRoundIndex: 1,
    round: toPublicRound(rounds[0]),
  };
}

export function submitChallengeAnswer(input: ChallengeAnswerRequest): ChallengeAnswerResponse {
  const session = sessions.get(input.sessionId);

  if (!session) {
    return expiredResponse();
  }

  const round = session.rounds[session.currentRoundIndex];

  if (!round || round.roundId !== input.roundId) {
    sessions.delete(input.sessionId);
    return expiredResponse();
  }

  if (input.selectedOptionId === round.correctOptionId) {
    session.correctCount += 1;
  } else {
    session.mistakeCount += 1;
  }

  const outcome = getChallengeOutcome(
    PUBLIC_CHALLENGE_CONFIG.totalRounds,
    PUBLIC_CHALLENGE_CONFIG.requiredPassCount,
    session.correctCount,
    session.mistakeCount,
  );

  if (outcome === 'passed') {
    sessions.delete(input.sessionId);
    return passResponse(session);
  }

  if (outcome === 'failed') {
    sessions.delete(input.sessionId);
    return failResponse(session);
  }

  session.currentRoundIndex += 1;
  const nextRound = session.rounds[session.currentRoundIndex];

  if (!nextRound) {
    sessions.delete(input.sessionId);
    return failResponse(session);
  }

  return {
    status: 'continue',
    correctCount: session.correctCount,
    mistakeCount: session.mistakeCount,
    remainingMistakesBeforeFailure: getRemainingMistakesBeforeFailure(
      PUBLIC_CHALLENGE_CONFIG.totalRounds,
      PUBLIC_CHALLENGE_CONFIG.requiredPassCount,
      session.mistakeCount,
    ),
    currentRoundIndex: session.currentRoundIndex + 1,
    round: toPublicRound(nextRound),
  };
}
