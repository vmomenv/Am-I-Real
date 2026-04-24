import type { Asset } from '@/src/server/admin/assets-service';

import { AssetCard } from '@/src/components/admin/AssetCard';

type AssetColumnProps = {
  title: string;
  description: string;
  assets: Asset[];
};

const TITLE_LABELS: Record<string, string> = {
  'AI Image Pool': 'AI 图片资产池',
  'Real Photo Pool': '真人图片资产池',
};

const DESCRIPTION_LABELS: Record<string, string> = {
  'Synthetic candidates available for challenge generation and review.': '用于挑战生成与复核的 AI 图片候选资产。',
  'Verified human photography that anchors the real-photo challenge pool.': '用于真人图片题库的已核验摄影素材。',
};

export function AssetColumn({ title, description, assets }: AssetColumnProps) {
  const localizedTitle = TITLE_LABELS[title] ?? title;
  const localizedDescription = DESCRIPTION_LABELS[description] ?? description;

  return (
    <section className="rounded-[28px] border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-50">{localizedTitle}</h2>
          <p className="mt-1 max-w-md text-sm text-slate-400">{localizedDescription}</p>
        </div>
        <div className="flex items-center justify-between gap-3 xl:block xl:text-right">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
            <p>{assets.length} 已加载</p>
            <p className="mt-2 text-slate-600">排序 最新上传</p>
          </div>
          <button
            className="cursor-pointer rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:border-emerald-400 hover:text-white"
            type="button"
          >
            上传图片
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
        <span className="rounded-full border border-slate-800 px-3 py-1.5">检索 文件名</span>
        <span className="rounded-full border border-slate-800 px-3 py-1.5">筛选 全部状态</span>
        <span className="rounded-full border border-slate-800 px-3 py-1.5">模式 运营台</span>
      </div>

      {assets.length > 0 ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {assets.map((asset) => (
            <AssetCard asset={asset} key={asset.id} />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-800 bg-slate-950/70 px-4 py-10 text-sm text-slate-500">
          当前资产池暂无图片，请先上传图片。
        </div>
      )}
    </section>
  );
}
