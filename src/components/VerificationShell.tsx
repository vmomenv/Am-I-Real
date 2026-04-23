interface VerificationShellProps {
  brandName: string;
  siteName: string;
  progressValue: number;
  progressMax: number;
  buttonLabel: string;
  buttonDisabled?: boolean;
  errorMessage?: string | null;
  onAction: () => void;
}

export function VerificationShell({
  brandName,
  siteName,
  progressValue,
  progressMax,
  buttonLabel,
  buttonDisabled = false,
  errorMessage,
  onAction,
}: VerificationShellProps) {
  const progressPercent = progressMax > 0 ? (progressValue / progressMax) * 100 : 0;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-20">
      <section className="w-full max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-950/30 backdrop-blur">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">{brandName}</p>
        <h1 className="mt-4 text-4xl font-semibold text-white">{siteName}</h1>
        <p className="mt-4 text-base leading-7 text-slate-300">请完成 Groundflare 人机验证。</p>
        <div className="mt-8">
          <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
            <span>验证进度</span>
            <span>
              {progressValue} / {progressMax}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              aria-hidden="true"
              className="h-full rounded-full bg-cyan-400 transition-[width]"
              style={{ width: `${Math.max(0, Math.min(progressPercent, 100))}%` }}
            />
          </div>
        </div>
        {errorMessage ? (
          <p className="mt-6 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {errorMessage}
          </p>
        ) : null}
        <button
          className="mt-8 inline-flex rounded-full bg-cyan-400 px-6 py-3 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
          disabled={buttonDisabled}
          onClick={onAction}
          type="button"
        >
          {buttonLabel}
        </button>
      </section>
    </main>
  );
}
