import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  ADMIN_SESSION_COOKIE_NAME,
  readAdminSessionCookieValue,
} from '@/src/server/admin/session-cookie';

type ProtectedAdminLayoutProps = {
  children: ReactNode;
};

export default function ProtectedAdminLayout({ children }: ProtectedAdminLayoutProps) {
  const session = readAdminSessionCookieValue(
    cookies().get(ADMIN_SESSION_COOKIE_NAME)?.value,
  );

  if (!session) {
    redirect('/admin/login');
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 font-mono text-slate-50">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="rounded-[28px] border border-slate-800 bg-slate-900/80 px-6 py-5 shadow-[0_0_40px_rgba(15,23,42,0.2)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Groundflare admin terminal
          </p>
          <div className="mt-3 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Authenticated shell</h1>
              <p className="mt-1 text-sm text-slate-400">Signed in as {session.username}. Asset desk live.</p>
            </div>
            <form action="/api/admin/auth/logout" method="post">
              <button
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500"
                type="submit"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        <section className="rounded-[28px] border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-300 xl:p-8">
          {children}
        </section>
      </div>
    </main>
  );
}
