import type {
  ChallengeAnswerRequest,
  ChallengeAnswerResponse,
  ChallengeStartResponse,
  PublicChallengeConfig,
} from '@/src/lib/challenge-types';
import {
  getChallengeOutcome,
  getRemainingMistakesBeforeFailure,
} from '@/src/lib/challenge-rules';
import type Database from 'better-sqlite3';

import { createChallengePlan } from '@/src/server/admin/challenge-generator';
import {
  createChallengeSession,
  getChallengeSession,
  saveChallengeSession,
} from '@/src/server/admin/challenge-sessions-service';
import { getSiteSettings } from '@/src/server/admin/settings-service';

const BRAND_NAME = 'Groundflare';

function toPublicRound(round: { roundId: string; prompt: string; options: Array<{ id: string; imageUrl: string; alt: string }> }) {
  return {
    roundId: round.roundId,
    prompt: round.prompt,
    options: round.options,
  };
}

function toPublicConfig(db?: Database.Database): PublicChallengeConfig {
  const settings = getSiteSettings({ db });

  return {
    brandName: BRAND_NAME,
    displaySiteName: settings.displaySiteName,
    successRedirectUrl: settings.successRedirectUrl,
    audioUrl: settings.audioUrl,
    totalRounds: settings.totalRounds,
    requiredPassCount: settings.requiredPassCount,
  };
}

function failResponse(session: { correctCount: number; mistakeCount: number }) {
  return {
    status: 'failed' as const,
    correctCount: session.correctCount,
    mistakeCount: session.mistakeCount,
    message: '你不是人类！',
  };
}

function passResponse(session: { correctCount: number; mistakeCount: number }, config: PublicChallengeConfig) {
  return {
    status: 'passed' as const,
    correctCount: session.correctCount,
    mistakeCount: session.mistakeCount,
    redirectUrl: config.successRedirectUrl,
  };
}

function expiredResponse() {
  return {
    status: 'expired' as const,
    message: '验证已过期，请重新开始',
  };
}

export function resetChallengeSessions() {
  // Sessions are persisted in the database now.
}

export function getPublicConfig(input: { db?: Database.Database } = {}): PublicChallengeConfig {
  return toPublicConfig(input.db);
}

export function startChallengeSession(input: { db?: Database.Database; rng?: () => number } = {}): ChallengeStartResponse {
  const config = toPublicConfig(input.db);
  const roundPlan = createChallengePlan({
    db: input.db,
    totalRounds: config.totalRounds,
    rng: input.rng,
  });
  const session = createChallengeSession({ db: input.db, roundPlan });

  return {
    ...config,
    sessionId: session.id,
    currentRoundIndex: 1,
    round: toPublicRound(roundPlan[0]),
  };
}

export function submitChallengeAnswer(
  input: ChallengeAnswerRequest,
  options: { db?: Database.Database } = {},
): ChallengeAnswerResponse {
  const config = toPublicConfig(options.db);
  const session = getChallengeSession({ db: options.db, id: input.sessionId });

  if (!session || session.status !== 'active') {
    return expiredResponse();
  }

  const round = session.roundPlan[session.currentRoundIndex];

  if (!round || round.roundId !== input.roundId) {
    saveChallengeSession({
      db: options.db,
      session: {
        ...session,
        status: 'expired',
      },
    });
    return expiredResponse();
  }

  if (input.selectedOptionId === round.correctOptionId) {
    session.correctCount += 1;
  } else {
    session.mistakeCount += 1;
  }

  const outcome = getChallengeOutcome(
    config.totalRounds,
    config.requiredPassCount,
    session.correctCount,
    session.mistakeCount,
  );

  if (outcome === 'passed') {
    saveChallengeSession({
      db: options.db,
      session: {
        ...session,
        status: 'passed',
      },
    });
    return passResponse(session, config);
  }

  if (outcome === 'failed') {
    saveChallengeSession({
      db: options.db,
      session: {
        ...session,
        status: 'failed',
      },
    });
    return failResponse(session);
  }

  session.currentRoundIndex += 1;
  const nextRound = session.roundPlan[session.currentRoundIndex];

  if (!nextRound) {
    saveChallengeSession({
      db: options.db,
      session: {
        ...session,
        status: 'failed',
      },
    });
    return failResponse(session);
  }

  saveChallengeSession({
    db: options.db,
    session,
  });

  return {
    status: 'continue',
    correctCount: session.correctCount,
    mistakeCount: session.mistakeCount,
    remainingMistakesBeforeFailure: getRemainingMistakesBeforeFailure(
      config.totalRounds,
      config.requiredPassCount,
      session.mistakeCount,
    ),
    currentRoundIndex: session.currentRoundIndex + 1,
    round: toPublicRound(nextRound),
  };
}
