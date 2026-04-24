'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type SessionState = {
  authenticated: boolean;
  user?: {
    id: string;
    username: string;
  };
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object' || !("message" in payload)) {
    return null;
  }

  const { message } = payload as { message?: unknown };

  return typeof message === 'string' ? message : null;
}

export function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    void fetch('/api/admin/auth/session', { cache: 'no-store' })
      .then(async (response) => {
        const payload = (await response.json()) as SessionState;
        if (isMounted) {
          setSessionState(payload);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSessionState({ authenticated: false });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    startTransition(() => {
      void fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        })
        .then(async (response) => {
          const payload = (await response.json()) as unknown;

          if (!response.ok) {
            setErrorMessage(getErrorMessage(payload) ?? '登录失败，请重试。');
            return;
          }

          setPassword('');
          setSessionState(payload as SessionState);
          router.push('/admin');
          router.refresh();
        })
        .catch(() => {
          setErrorMessage('登录失败，请重试。');
        });
    });
  }

  async function handleLogout() {
    setErrorMessage(null);

    const response = await fetch('/api/admin/auth/logout', {
      headers: {
        Accept: 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok) {
      setErrorMessage('退出失败，请重试。');
      return;
    }

    setSessionState({ authenticated: false });
    router.refresh();
  }

  return (
    <section className="w-full max-w-md rounded-[28px] border border-slate-800 bg-slate-900/90 p-8 shadow-[0_0_40px_rgba(2,6,23,0.35)]">
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.3em] text-sky-300">
          运营控制台
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-50">管理员登录</h1>
        <p className="text-sm leading-7 text-slate-300">请使用后台账号登录，继续处理审核、资源与配置任务。</p>
      </div>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2 text-sm font-medium text-slate-200">
          <span>账号</span>
          <input
            autoComplete="username"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none transition focus:border-emerald-500"
            onChange={(event) => setUsername(event.target.value)}
            value={username}
          />
        </label>

        <label className="block space-y-2 text-sm font-medium text-slate-200">
          <span>密码</span>
          <input
            autoComplete="current-password"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-50 outline-none transition focus:border-emerald-500"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>

        <button
          className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
          disabled={isPending}
          type="submit"
        >
          {isPending ? '登录中...' : '登录后台'}
        </button>
      </form>

      {errorMessage ? (
        <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {errorMessage}
        </p>
      ) : null}

      {sessionState?.authenticated ? (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <p>当前已登录账号：{sessionState.user?.username}</p>
          <button className="mt-3 cursor-pointer text-sm font-medium text-emerald-300 underline" onClick={handleLogout} type="button">
            退出登录
          </button>
        </div>
      ) : null}
    </section>
  );
}
