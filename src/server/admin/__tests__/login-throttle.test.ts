// @vitest-environment node

import {
  clearAdminLoginThrottle,
  getAdminLoginThrottleStatus,
  recordFailedAdminLogin,
} from '@/src/server/admin/login-throttle';

describe('login-throttle', () => {
  afterEach(() => {
    clearAdminLoginThrottle({ ipAddress: '127.0.0.1', username: 'admin' });
  });

  it('blocks repeated failed login attempts for the same ip and username', () => {
    const subject = {
      ipAddress: '127.0.0.1',
      username: 'admin',
    };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(getAdminLoginThrottleStatus(subject).isBlocked).toBe(false);
      recordFailedAdminLogin(subject);
    }

    expect(getAdminLoginThrottleStatus(subject).isBlocked).toBe(true);
    expect(getAdminLoginThrottleStatus({ ipAddress: '127.0.0.1', username: 'other-admin' }).isBlocked).toBe(false);
  });
});
