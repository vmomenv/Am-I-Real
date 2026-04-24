import type { Asset } from '@/src/server/admin/assets-service';
import type { SiteSettings } from '@/src/server/admin/settings-service';

import { AssetColumn } from '@/src/components/admin/AssetColumn';
import { SettingsRail } from '@/src/components/admin/SettingsRail';
import { UploadDrawer } from '@/src/components/admin/UploadDrawer';

type AdminDualImageDeskProps = {
  aiAssets: Asset[];
  realAssets: Asset[];
  settings: SiteSettings;
};

export function AdminDualImageDesk({ aiAssets, realAssets, settings }: AdminDualImageDeskProps) {
  return (
    <div className="space-y-6 font-mono">
      <section className="rounded-[28px] border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">dual image desk</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">Ground truth asset operator surface</h2>
          </div>
          <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">AI ready</p>
              <p className="mt-2 text-xl text-slate-50">{aiAssets.filter((asset) => asset.isActive).length}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Real ready</p>
              <p className="mt-2 text-xl text-slate-50">{realAssets.filter((asset) => asset.isActive).length}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pass rule</p>
              <p className="mt-2 text-xl text-slate-50">{settings.requiredPassCount}/{settings.totalRounds}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
        <AssetColumn
          assets={aiAssets}
          description="Synthetic candidates available for challenge generation and review."
          title="AI Image Pool"
        />
        <AssetColumn
          assets={realAssets}
          description="Verified human photography that anchors the real-photo challenge pool."
          title="Real Photo Pool"
        />
        <UploadDrawer />
      </div>

      <SettingsRail settings={settings} />
    </div>
  );
}
