'use client';

import type { Asset } from '@/src/server/admin/assets-service';

import { useId, useState } from 'react';

type AssetCardProps = {
  asset: Asset;
  onDelete?: (asset: Asset) => void;
  onRename?: (asset: Asset, nextName: string) => void;
  onToggle?: (asset: Asset) => void;
};

function formatTimestamp(value: string) {
  return value.replace('T', ' ').slice(0, 16);
}

export function AssetCard({ asset, onDelete, onRename, onToggle }: AssetCardProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [nextName, setNextName] = useState(asset.originalFilename);
  const renameFieldId = useId();

  function handleRenameSubmit() {
    const trimmedName = nextName.trim();

    if (!trimmedName) {
      return;
    }

    onRename?.(asset, trimmedName);
    setNextName(trimmedName);
    setIsRenaming(false);
  }

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-slate-100 shadow-[0_0_0_1px_rgba(15,23,42,0.3)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-50">{asset.originalFilename}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{asset.id}</p>
        </div>
        <span
          className={`rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.2em] ${
            asset.isActive
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : 'border-slate-700 bg-slate-900 text-slate-400'
          }`}
        >
          {asset.isActive ? '已启用' : '已停用'}
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
        {asset.kind === 'audio' ? (
          <div className="px-3 py-4">
            <audio className="w-full" controls preload="none" src={`/${asset.filePath}`}>
              浏览器暂不支持音频预览。
            </audio>
          </div>
        ) : (
          <img
            alt={asset.originalFilename}
            className="aspect-[4/3] w-full bg-slate-950 object-cover"
            loading="lazy"
            src={`/${asset.filePath}`}
          />
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-400">
        <div>
          <dt className="uppercase tracking-[0.2em] text-slate-600">上传时间</dt>
          <dd className="mt-1 text-slate-200">{formatTimestamp(asset.createdAt)}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.2em] text-slate-600">文件大小</dt>
          <dd className="mt-1 text-slate-200">{Math.max(1, Math.round(asset.fileSize / 1024))} KB</dd>
        </div>
      </dl>

      {isRenaming ? (
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-300">
          <label className="block text-[11px] uppercase tracking-[0.2em] text-slate-500" htmlFor={renameFieldId}>
            新的素材名称
          </label>
          <div className="mt-2 flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-400"
              id={renameFieldId}
              onChange={(event) => setNextName(event.target.value)}
              value={nextName}
            />
            <button
              className="cursor-pointer rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 font-medium text-emerald-200 transition hover:border-emerald-400 hover:text-white"
              onClick={handleRenameSubmit}
              type="button"
            >
              保存名称
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
        <button
          className="cursor-pointer rounded-lg border border-slate-700 px-3 py-2 text-slate-200 transition hover:border-slate-500 hover:text-white"
          onClick={() => setIsRenaming((value) => !value)}
          type="button"
        >
          重命名
        </button>
        <button
          className="cursor-pointer rounded-lg border border-slate-700 px-3 py-2 text-slate-200 transition hover:border-slate-500 hover:text-white"
          onClick={() => onToggle?.(asset)}
          type="button"
        >
          {asset.isActive ? '停用' : '启用'}
        </button>
        <button
          className="cursor-pointer rounded-lg border border-rose-900/70 bg-rose-950/40 px-3 py-2 text-rose-200 transition hover:border-rose-700 hover:text-white"
          onClick={() => onDelete?.(asset)}
          type="button"
        >
          删除
        </button>
      </div>
    </article>
  );
}
