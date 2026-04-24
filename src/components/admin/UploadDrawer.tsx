export function UploadDrawer() {
  return (
    <aside className="rounded-[28px] border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">上传图片</h2>
          <p className="mt-1 text-sm text-slate-400">上传队列保持常驻，方便运营人员快速补充题库素材。</p>
        </div>
        <span className="rounded-full border border-slate-800 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-500">
          上传队列
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <button className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-left text-sm text-slate-200 transition hover:border-slate-600" type="button">
          上传 AI 图片
        </button>
        <button className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-left text-sm text-slate-200 transition hover:border-slate-600" type="button">
          上传真人图片
        </button>
        <button className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4 text-left text-sm text-slate-200 transition hover:border-slate-600" type="button">
          上传音频素材
        </button>
      </div>
    </aside>
  );
}
