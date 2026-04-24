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
  const aiReadyCount = aiAssets.filter((asset) => asset.isActive).length;
  const realReadyCount = realAssets.filter((asset) => asset.isActive).length;

  return (
    <div className="space-y-6 font-mono">
      <section className="rounded-[28px] border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">operations console</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">管理员运营控制台</h2>
            <p className="mt-3 text-sm text-slate-400">集中处理素材池巡检、配置更新与音频上传。</p>
          </div>
          <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2 xl:min-w-[640px] xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3">
              <p className="text-xs tracking-[0.2em] text-slate-500">当前管理员</p>
              <p className="mt-2 text-base text-slate-50">系统管理员</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3">
              <p className="text-xs tracking-[0.2em] text-slate-500">最近保存时间</p>
              <p className="mt-2 text-base text-slate-50">{settings.updatedAt.replace('T', ' ').slice(0, 16)}</p>
            </div>
            <button
              aria-label="快速上传"
              className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-left transition hover:border-emerald-400 hover:bg-emerald-500/15"
              type="button"
            >
              <p className="text-xs tracking-[0.2em] text-emerald-300">快速上传</p>
              <p className="mt-2 text-base text-slate-50">打开素材上传抽屉</p>
            </button>
            <button
              aria-label="退出登录"
              className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-left transition hover:border-rose-400/60 hover:bg-rose-500/10"
              type="button"
            >
              <p className="text-xs tracking-[0.2em] text-slate-500">退出登录</p>
              <p className="mt-2 text-base text-slate-50">结束当前控制台会话</p>
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3">
            <p className="text-xs tracking-[0.2em] text-slate-500">AI 就绪数量</p>
            <p className="mt-2 text-xl text-slate-50">{aiReadyCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3">
            <p className="text-xs tracking-[0.2em] text-slate-500">真实就绪数量</p>
            <p className="mt-2 text-xl text-slate-50">{realReadyCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3">
            <p className="text-xs tracking-[0.2em] text-slate-500">当前通关规则</p>
            <p className="mt-2 text-xl text-slate-50">{settings.requiredPassCount}/{settings.totalRounds}</p>
            <p className="mt-1 text-xs text-slate-500">通过轮数 / 总轮数</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
        <AssetColumn
          assets={aiAssets}
          description="用于挑战编排与巡检的 AI 候选图片。"
          title="AI 图片池"
        />
        <AssetColumn
          assets={realAssets}
          description="已核验的真实摄影素材，用于保持挑战题库平衡。"
          title="真实图片池"
        />
        <UploadDrawer />
      </div>

      <SettingsRail settings={settings} />
    </div>
  );
}
