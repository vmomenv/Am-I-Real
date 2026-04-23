import { NextResponse } from 'next/server';

import type { ChallengeAnswerRequest } from '@/src/lib/challenge-types';
import { submitChallengeAnswer } from '@/src/server/challenge-service';

export async function POST(request: Request) {
  const payload = (await request.json()) as ChallengeAnswerRequest;

  return NextResponse.json(submitChallengeAnswer(payload));
}
