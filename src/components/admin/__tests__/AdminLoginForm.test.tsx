import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import { AdminLoginForm } from '@/src/components/admin/AdminLoginForm';

const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
    refresh,
  }),
}));

describe('AdminLoginForm', () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
  });

  it('navigates into the protected admin area after a successful login', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({ authenticated: false }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: {
            id: 'admin-1',
            username: 'admin',
          },
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    render(<AdminLoginForm />);

    await screen.findByRole('button', { name: 'Sign in' });

    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'correct-horse-battery-staple' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/admin');
    });
  });
});
