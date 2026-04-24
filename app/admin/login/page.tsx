import { AdminLoginForm } from '@/src/components/admin/AdminLoginForm';

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-20 text-slate-50">
      <div className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-6xl items-center justify-center rounded-[32px] border border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.16),_transparent_28%),linear-gradient(180deg,_rgba(15,23,42,0.95),_rgba(2,6,23,0.98))] p-8 shadow-[0_0_60px_rgba(2,6,23,0.45)] lg:justify-between lg:p-12">
        <div className="hidden max-w-xl space-y-4 lg:block">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-emerald-400">Groundflare backend</p>
          <h1 className="font-mono text-5xl font-semibold leading-tight text-slate-50">
            Operator login for the image desk terminal.
          </h1>
          <p className="max-w-lg text-sm text-slate-400">
            Authenticate once, then manage AI assets, real photo pools, and live challenge settings from a single desktop surface.
          </p>
        </div>
        <AdminLoginForm />
      </div>
    </main>
  );
}
