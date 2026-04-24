// @vitest-environment node

import { POST } from '@/app/api/admin/auth/logout/route';

describe('admin logout route', () => {
  it('redirects browser logout requests back to the login page', () => {
    const response = POST(
      new Request('http://localhost/api/admin/auth/logout', {
        method: 'POST',
        headers: {
          Accept: 'text/html',
        },
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/admin/login');
  });
});
