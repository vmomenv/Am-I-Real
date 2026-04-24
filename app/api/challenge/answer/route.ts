import { NextResponse } from 'next/server';

import type { ChallengeAnswerRequest } from '@/src/lib/challenge-types';
import { submitChallengeAnswer } from '@/src/server/challenge-service';

function getInvalidPayloadResponse() {
  return NextResponse.json(
    {
      code: 'INVALID_REQUEST',
      message: 'Invalid challenge answer payload.',
    },
    { status: 400 },
  );
}

function isChallengeAnswerRequest(payload: unknown): payload is ChallengeAnswerRequest {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return false;
  }

  const candidate = payload as Record<string, unknown>;

  return (
    typeof candidate.sessionId === 'string' &&
    typeof candidate.roundId === 'string' &&
    typeof candidate.selectedOptionId === 'string'
  );
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return getInvalidPayloadResponse();
  }

  if (!isChallengeAnswerRequest(payload)) {
    return getInvalidPayloadResponse();
  }

  return NextResponse.json(submitChallengeAnswer(payload));
}
