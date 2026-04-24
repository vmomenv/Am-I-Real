import type { Asset } from '@/src/server/admin/assets-service';

import { AssetCard } from '@/src/components/admin/AssetCard';

type AssetColumnProps = {
  title: string;
  description: string;
  assets: Asset[];
  filterValue?: 'all' | 'active' | 'inactive';
  onDeleteAsset?: (asset: Asset) => void;
  onFilterChange?: (value: 'all' | 'active' | 'inactive') => void;
  onRenameAsset?: (asset: Asset, nextName: string) => void;
  onSearchChange?: (value: string) => void;
  onSortChange?: (value: 'latest' | 'oldest' | 'name-asc' | 'name-desc') => void;
  onToggleAsset?: (asset: Asset) => void;
  onUpload?: () => void;
  searchValue?: string;
  sortValue?: 'latest' | 'oldest' | 'name-asc' | 'name-desc';
};

const TITLE_LABELS: Record<string, string> = {
  'AI Image Pool': 'AI 图片资产池',
  'Real Photo Pool': '真人图片资产池',
};

const DESCRIPTION_LABELS: Record<string, string> = {
  'Synthetic candidates available for challenge generation and review.': '用于挑战生成与复核的 AI 图片候选资产。',
  'Verified human photography that anchors the real-photo challenge pool.': '用于真人图片题库的已核验摄影素材。',
};

export function AssetColumn({
  title,
  description,
  assets,
  filterValue = 'all',
  onDeleteAsset,
  onFilterChange,
  onRenameAsset,
  onSearchChange,
  onSortChange,
  onToggleAsset,
  onUpload,
  searchValue = '',
  sortValue = 'latest',
}: AssetColumnProps) {
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
            onClick={onUpload}
            type="button"
          >
            上传图片
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-xs text-slate-400 sm:grid-cols-[minmax(0,1fr)_160px_160px]">
        <label className="block">
          <span className="mb-1 block uppercase tracking-[0.2em] text-slate-500">搜索素材</span>
          <input
            aria-label="搜索素材"
            className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-400"
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder="按文件名或编号检索"
            type="search"
            value={searchValue}
          />
        </label>
        <label className="block">
          <span className="mb-1 block uppercase tracking-[0.2em] text-slate-500">状态筛选</span>
          <select
            aria-label="状态筛选"
            className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-400"
            onChange={(event) => onFilterChange?.(event.target.value as 'all' | 'active' | 'inactive')}
            value={filterValue}
          >
            <option value="all">全部状态</option>
            <option value="active">仅看启用</option>
            <option value="inactive">仅看停用</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block uppercase tracking-[0.2em] text-slate-500">排序方式</span>
          <select
            aria-label="排序方式"
            className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-400"
            onChange={(event) =>
              onSortChange?.(event.target.value as 'latest' | 'oldest' | 'name-asc' | 'name-desc')
            }
            value={sortValue}
          >
            <option value="latest">最新上传</option>
            <option value="oldest">最早上传</option>
            <option value="name-asc">文件名 A-Z</option>
            <option value="name-desc">文件名 Z-A</option>
          </select>
        </label>
      </div>

      {assets.length > 0 ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {assets.map((asset) => (
            <AssetCard
              asset={asset}
              key={asset.id}
              onDelete={onDeleteAsset}
              onRename={onRenameAsset}
              onToggle={onToggleAsset}
            />
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
