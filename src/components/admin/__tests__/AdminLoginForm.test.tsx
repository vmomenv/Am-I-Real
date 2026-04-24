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

  it('renders the Chinese admin login copy', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      json: async () => ({ authenticated: false }),
    });

    vi.stubGlobal('fetch', fetchMock);

    render(<AdminLoginForm />);

    expect(await screen.findByRole('heading', { name: '管理员登录' })).toBeInTheDocument();
    expect(screen.getByLabelText('账号')).toHaveValue('admin');
    expect(screen.getByLabelText('密码')).toHaveValue('');
    expect(screen.getByRole('button', { name: '登录后台' })).toBeInTheDocument();
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

    await screen.findByRole('button', { name: '登录后台' });

    fireEvent.change(screen.getByLabelText('密码'), {
      target: { value: 'correct-horse-battery-staple' },
    });
    fireEvent.click(screen.getByRole('button', { name: '登录后台' }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/admin');
    });
  });
});
