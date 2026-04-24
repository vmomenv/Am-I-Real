import { NextResponse } from 'next/server';

import { ChallengeServiceError, startChallengeSession } from '@/src/server/challenge-service';

export function POST() {
  try {
    return NextResponse.json(startChallengeSession());
  } catch (error) {
    if (error instanceof ChallengeServiceError) {
      return NextResponse.json(
        {
          code: error.code,
          message: error.message,
        },
        { status: error.status },
      );
    }

    throw error;
  }
}
