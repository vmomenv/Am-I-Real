interface VerificationShellProps {
  brandName: string;
  siteName: string;
  buttonLabel: string;
  buttonDisabled?: boolean;
  errorMessage?: string | null;
  onAction: () => void;
}

export function VerificationShell({
  brandName,
  siteName,
  buttonLabel,
  buttonDisabled = false,
  errorMessage,
  onAction,
}: VerificationShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-20">
      <section className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">{brandName}</p>
            <p className="mt-1 text-xs text-slate-500">Security verification service</p>
          </div>
          <p className="text-xs text-slate-400">Ray ID: gf-demo</p>
        </header>

        <div className="space-y-8 px-6 py-8">
          <div>
            <p className="text-4xl font-bold tracking-tight text-slate-950">{siteName}</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">正在进行安全验证</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
              本网站需要先验证您的连接安全性。完成验证前，此页面会暂时显示。请不要关闭或刷新浏览器。
            </p>
          </div>

          {buttonDisabled ? (
            <div className="mx-auto flex w-full max-w-md items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <span className="flex items-center gap-3">
                <span className="grid h-6 w-6 grid-cols-2 gap-1">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 [animation-delay:120ms]" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 [animation-delay:240ms]" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 [animation-delay:360ms]" />
                </span>
                <span className="text-base font-medium text-slate-900">正在验证...</span>
              </span>
              <span className="text-right text-[11px] leading-4 text-slate-400">
                Privacy
                <br />
                Terms
              </span>
            </div>
          ) : (
            <button
              aria-label={buttonLabel}
              className="mx-auto flex w-full max-w-md items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition-colors duration-200 hover:border-slate-300"
              onClick={onAction}
              type="button"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded border-2 border-slate-300 bg-white text-sm text-slate-500" />
                <span className="text-base font-medium text-slate-900">{buttonLabel}</span>
              </span>
              <span className="text-right text-[11px] leading-4 text-slate-400">
                Privacy
                <br />
                Terms
              </span>
            </button>
          )}

          {errorMessage ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
