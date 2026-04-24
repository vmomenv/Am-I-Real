export function UploadDrawer() {
  return (
    <aside className="rounded-[28px] border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">Upload Drawer</h2>
          <p className="mt-1 text-sm text-slate-400">Task 5 keeps uploads as a visible operator shell without wiring the full flow.</p>
        </div>
        <span className="rounded-full border border-slate-800 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-500">
          standby
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <button className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-left text-sm text-slate-200 transition hover:border-slate-600" type="button">
          Queue AI image
        </button>
        <button className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-left text-sm text-slate-200 transition hover:border-slate-600" type="button">
          Queue real photo
        </button>
        <button className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-left text-sm text-slate-200 transition hover:border-slate-600" type="button">
          Queue audio asset
        </button>
      </div>
    </aside>
  );
}
