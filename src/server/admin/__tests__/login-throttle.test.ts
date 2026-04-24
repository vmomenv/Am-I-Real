// @vitest-environment node

import {
  clearAdminLoginThrottle,
  getAdminLoginThrottleStatus,
  recordFailedAdminLogin,
} from '@/src/server/admin/login-throttle';

describe('login-throttle', () => {
  afterEach(() => {
    clearAdminLoginThrottle({ username: 'admin' });
    clearAdminLoginThrottle({ username: 'other-admin' });
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
});
