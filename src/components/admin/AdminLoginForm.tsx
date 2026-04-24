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
          const payload = (await response.json()) as
            | SessionState
            | { message?: string };

          if (!response.ok) {
            setErrorMessage(payload.message ?? 'Login failed.');
            return;
          }

          setPassword('');
          setSessionState(payload as SessionState);
          router.refresh();
        })
        .catch(() => {
          setErrorMessage('Login failed.');
        });
    });
  }

  async function handleLogout() {
    setErrorMessage(null);

    const response = await fetch('/api/admin/auth/logout', {
      method: 'POST',
    });

    if (!response.ok) {
      setErrorMessage('Logout failed.');
      return;
    }

    setSessionState({ authenticated: false });
    router.refresh();
  }

  return (
    <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          Groundflare admin
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Sign in</h1>
        <p className="text-sm text-slate-600">Single-operator access for the admin terminal.</p>
      </div>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2 text-sm font-medium text-slate-800">
          <span>Username</span>
          <input
            autoComplete="username"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            onChange={(event) => setUsername(event.target.value)}
            value={username}
          />
        </label>

        <label className="block space-y-2 text-sm font-medium text-slate-800">
          <span>Password</span>
          <input
            autoComplete="current-password"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>

        <button
          className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={isPending}
          type="submit"
        >
          {isPending ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      {errorMessage ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      {sessionState?.authenticated ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p>Authenticated as {sessionState.user?.username}.</p>
          <button className="mt-3 text-sm font-medium text-emerald-900 underline" onClick={handleLogout} type="button">
            Sign out
          </button>
        </div>
      ) : null}
    </section>
  );
}
