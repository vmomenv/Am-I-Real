import { NextResponse } from 'next/server';

import { listChallengeSessions } from '@/src/server/admin/challenge-sessions-service';
import { requireAdminSession } from '@/src/server/admin/route-auth';

export function GET(request: Request) {
  const unauthorizedResponse = requireAdminSession(request);

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  return NextResponse.json({ sessions: listChallengeSessions() });
}
