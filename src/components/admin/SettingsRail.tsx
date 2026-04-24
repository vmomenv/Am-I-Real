import type { SiteSettings } from '@/src/server/admin/settings-service';

type SettingsRailProps = {
  settings: SiteSettings;
};

type SettingInputProps = {
  label: string;
  value: string;
  type?: 'text' | 'url' | 'number';
};

function SettingInput({ label, value, type = 'text' }: SettingInputProps) {
  const inputId = `settings-${label}`;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
      <label className="block" htmlFor={inputId}>
        <span className="text-xs tracking-[0.2em] text-slate-400">{label}</span>
      </label>
      <input
        className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400"
        defaultValue={value}
        id={inputId}
        type={type}
      />
    </div>
  );
}

export function SettingsRail({ settings }: SettingsRailProps) {
  return (
    <section className="rounded-[28px] border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-50">站点配置</h2>
          <p className="mt-1 text-sm text-slate-400">在这里直接维护站点展示信息、跳转规则和背景音乐配置。</p>
        </div>
        <p className="text-xs tracking-[0.2em] text-slate-500">最近更新 {settings.updatedAt.replace('T', ' ').slice(0, 16)}</p>
      </div>

      <form className="mt-5 space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <SettingInput label="显示站点名" value={settings.displaySiteName} />
          <SettingInput label="成功跳转地址" type="url" value={settings.successRedirectUrl} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <SettingInput label="背景音乐" value={settings.audioUrl ?? settings.audioAssetId ?? '/1.mp3'} />
          <div className="flex items-end">
            <button
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 transition hover:border-emerald-400 hover:text-emerald-300"
              type="button"
            >
              上传音频
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SettingInput label="总轮数" type="number" value={String(settings.totalRounds)} />
          <SettingInput label="通过轮数" type="number" value={String(settings.requiredPassCount)} />
        </div>

        <div className="flex justify-end border-t border-slate-800 pt-4">
          <button
            className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-sm text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/15"
            type="submit"
          >
            保存配置
          </button>
        </div>
      </form>
    </section>
  );
}
