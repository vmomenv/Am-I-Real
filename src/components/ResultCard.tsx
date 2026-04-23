interface ResultCardProps {
  brandName: string;
  title: string;
  message?: string | null;
  actionLabel?: string;
  onAction?: () => void;
}

export function ResultCard({
  brandName,
  title,
  message,
  actionLabel,
  onAction,
}: ResultCardProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-20">
      <section className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-950/30 backdrop-blur">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">{brandName}</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">{title}</h1>
        {message ? <p className="mt-4 text-base leading-7 text-slate-300">{message}</p> : null}
        {actionLabel && onAction ? (
          <button
            className="mt-8 inline-flex rounded-full bg-cyan-400 px-6 py-3 text-sm font-medium text-slate-950"
            onClick={onAction}
            type="button"
          >
            {actionLabel}
          </button>
        ) : null}
      </section>
    </main>
  );
}
