import { NextResponse } from 'next/server';

import { getPublicConfig } from '@/src/server/challenge-service';

export function GET() {
  return NextResponse.json(getPublicConfig());
}
