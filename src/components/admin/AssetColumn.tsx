import type { Asset } from '@/src/server/admin/assets-service';

import { AssetCard } from '@/src/components/admin/AssetCard';

type AssetColumnProps = {
  title: string;
  description: string;
  assets: Asset[];
};

export function AssetColumn({ title, description, assets }: AssetColumnProps) {
  return (
    <section className="rounded-[28px] border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-50">{title}</h2>
          <p className="mt-1 max-w-md text-sm text-slate-400">{description}</p>
        </div>
        <div className="text-right text-xs uppercase tracking-[0.2em] text-slate-500">
          <p>{assets.length} loaded</p>
          <p className="mt-2 text-slate-600">sort: newest</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
        <span className="rounded-full border border-slate-800 px-3 py-1.5">search shell</span>
        <span className="rounded-full border border-slate-800 px-3 py-1.5">filter: all</span>
        <span className="rounded-full border border-slate-800 px-3 py-1.5">bulk actions later</span>
      </div>

      {assets.length > 0 ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {assets.map((asset) => (
            <AssetCard asset={asset} key={asset.id} />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-800 bg-slate-950/70 px-4 py-10 text-sm text-slate-500">
          No assets loaded for this pool yet.
        </div>
      )}
    </section>
  );
}
