const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 5 * 60 * 1000;

type AdminLoginThrottleInput = {
  username: string;
};

type AdminLoginThrottleEntry = {
  failureCount: number;
  blockedUntil: number | null;
};

const loginThrottleEntries = new Map<string, AdminLoginThrottleEntry>();

function getThrottleKey(input: AdminLoginThrottleInput) {
  return input.username.trim().toLowerCase();
}

function pruneStaleAdminLoginThrottleEntries(now: number) {
  for (const [key, entry] of loginThrottleEntries.entries()) {
    if (entry.blockedUntil && entry.blockedUntil <= now) {
      loginThrottleEntries.delete(key);
    }
  }
}

export function getAdminLoginThrottleStatus(
  input: AdminLoginThrottleInput,
  now = Date.now(),
) {
  pruneStaleAdminLoginThrottleEntries(now);

  const key = getThrottleKey(input);
  const entry = loginThrottleEntries.get(key);

  if (!entry) {
    return { isBlocked: false, retryAfterSeconds: 0 };
  }

  if (entry.blockedUntil && entry.blockedUntil > now) {
    return {
      isBlocked: true,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.blockedUntil - now) / 1000)),
    };
  }

  return { isBlocked: false, retryAfterSeconds: 0 };
}

export function recordFailedAdminLogin(
  input: AdminLoginThrottleInput,
  now = Date.now(),
) {
  pruneStaleAdminLoginThrottleEntries(now);

  const key = getThrottleKey(input);
  const currentEntry = loginThrottleEntries.get(key);
  const nextFailureCount = (currentEntry?.failureCount ?? 0) + 1;

  loginThrottleEntries.set(key, {
    failureCount: nextFailureCount,
    blockedUntil: nextFailureCount >= MAX_FAILED_ATTEMPTS ? now + BLOCK_DURATION_MS : null,
  });

  return getAdminLoginThrottleStatus(input, now);
}

export function clearAdminLoginThrottle(input: AdminLoginThrottleInput) {
  loginThrottleEntries.delete(getThrottleKey(input));
}

export function getAdminLoginThrottleEntryCount() {
  return loginThrottleEntries.size;
}
