import { randomUUID } from 'node:crypto';

import type Database from 'better-sqlite3';

import type { InternalRound } from '@/src/lib/challenge-types';
import { bootstrapDatabase } from '@/src/server/db/bootstrap';
import { getDatabase } from '@/src/server/db/client';

type ChallengeSessionRow = {
  id: string;
  status: 'active' | 'passed' | 'failed' | 'expired';
  startedAt: string;
  finishedAt: string | null;
  currentRoundIndex: number;
  correctCount: number;
  mistakeCount: number;
  roundPlanJson: string;
  sessionConfigJson: string;
};

export type ChallengeSessionConfig = {
  successRedirectUrl: string;
  totalRounds: number;
  requiredPassCount: number;
};

export type PersistedChallengeSession = Omit<ChallengeSessionRow, 'roundPlanJson'> & {
  roundPlan: InternalRound[];
  sessionConfig: ChallengeSessionConfig;
};

function getReadyDatabase(db = getDatabase()) {
  bootstrapDatabase(db);
  return db;
}

function mapSession(row: ChallengeSessionRow): PersistedChallengeSession {
  return {
    ...row,
    roundPlan: JSON.parse(row.roundPlanJson) as InternalRound[],
    sessionConfig: JSON.parse(row.sessionConfigJson) as ChallengeSessionConfig,
  };
}

function getFinishedAt(status: PersistedChallengeSession['status'], currentFinishedAt: string | null) {
  if (status === 'active') {
    return null;
  }

  return currentFinishedAt ?? new Date().toISOString();
}

export function createChallengeSession(input: {
  db?: Database.Database;
  roundPlan: InternalRound[];
  sessionConfig: ChallengeSessionConfig;
}) {
  const db = getReadyDatabase(input.db);
  const id = randomUUID();

  db.prepare(
    `INSERT INTO challenge_sessions (
      id,
      status,
      currentRoundIndex,
      correctCount,
      mistakeCount,
      roundPlanJson,
      sessionConfigJson
    ) VALUES (?, 'active', 0, 0, 0, ?, ?)`,
  ).run(id, JSON.stringify(input.roundPlan), JSON.stringify(input.sessionConfig));

  return getChallengeSession({ db, id })!;
}

export function getChallengeSession(input: { db?: Database.Database; id: string }) {
  const db = getReadyDatabase(input.db);
  const row = db
    .prepare(
      `SELECT id, status, startedAt, finishedAt, currentRoundIndex, correctCount, mistakeCount, roundPlanJson
              , sessionConfigJson
       FROM challenge_sessions
       WHERE id = ?
       LIMIT 1`,
    )
    .get(input.id) as ChallengeSessionRow | undefined;

  return row ? mapSession(row) : null;
}

export function saveChallengeSession(input: {
  db?: Database.Database;
  session: PersistedChallengeSession;
}) {
  const db = getReadyDatabase(input.db);
  const finishedAt = getFinishedAt(input.session.status, input.session.finishedAt);

  db.prepare(
    `UPDATE challenge_sessions
     SET status = @status,
         finishedAt = @finishedAt,
         currentRoundIndex = @currentRoundIndex,
         correctCount = @correctCount,
         mistakeCount = @mistakeCount,
         roundPlanJson = @roundPlanJson,
         sessionConfigJson = @sessionConfigJson
     WHERE id = @id`,
  ).run({
    id: input.session.id,
    status: input.session.status,
    finishedAt,
    currentRoundIndex: input.session.currentRoundIndex,
    correctCount: input.session.correctCount,
    mistakeCount: input.session.mistakeCount,
    roundPlanJson: JSON.stringify(input.session.roundPlan),
    sessionConfigJson: JSON.stringify(input.session.sessionConfig),
  });

  return getChallengeSession({ db, id: input.session.id })!;
}

export function listChallengeSessions(input: { db?: Database.Database } = {}) {
  const db = getReadyDatabase(input.db);

  return (
    db
      .prepare(
        `SELECT id, status, startedAt, finishedAt, currentRoundIndex, correctCount, mistakeCount, roundPlanJson
                , sessionConfigJson
         FROM challenge_sessions
         ORDER BY datetime(startedAt) DESC, rowid DESC`,
      )
      .all() as ChallengeSessionRow[]
  ).map(mapSession);
}
