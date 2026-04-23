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
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">{brandName}</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
        {message ? <p className="mt-4 text-base leading-7 text-slate-600">{message}</p> : null}
        {actionLabel && onAction ? (
          <button
            className="mt-8 inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
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
