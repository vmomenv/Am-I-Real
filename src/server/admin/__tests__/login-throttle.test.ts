// @vitest-environment node

import {
  clearAdminLoginThrottle,
  getAdminLoginThrottleEntryCount,
  getAdminLoginThrottleStatus,
  recordFailedAdminLogin,
} from '@/src/server/admin/login-throttle';

describe('login-throttle', () => {
  afterEach(() => {
    clearAdminLoginThrottle({ username: 'admin' });
    clearAdminLoginThrottle({ username: 'other-admin' });
    clearAdminLoginThrottle({ username: 'stale-admin' });
    clearAdminLoginThrottle({ username: 'fresh-admin' });
  });

  it('blocks repeated failed login attempts for the same username regardless of forwarded ip', () => {
    const subject = {
      username: 'admin',
    };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(getAdminLoginThrottleStatus(subject).isBlocked).toBe(false);
      recordFailedAdminLogin(subject);
    }

    expect(getAdminLoginThrottleStatus(subject).isBlocked).toBe(true);
    expect(getAdminLoginThrottleStatus({ username: 'admin' }).isBlocked).toBe(true);
    expect(getAdminLoginThrottleStatus({ username: 'other-admin' }).isBlocked).toBe(false);
  });

  it('prunes stale entries while checking other usernames', () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      recordFailedAdminLogin({ username: 'stale-admin' }, 0);
    }

    expect(getAdminLoginThrottleEntryCount()).toBe(1);

    expect(getAdminLoginThrottleStatus({ username: 'fresh-admin' }, 5 * 60 * 1000 + 1)).toEqual({
      isBlocked: false,
      retryAfterSeconds: 0,
    });

    expect(getAdminLoginThrottleEntryCount()).toBe(0);
  });
});
