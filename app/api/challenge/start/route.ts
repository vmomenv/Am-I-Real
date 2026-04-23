import { NextResponse } from 'next/server';

import { startChallengeSession } from '@/src/server/challenge-service';

export function POST() {
  return NextResponse.json(startChallengeSession());
}
