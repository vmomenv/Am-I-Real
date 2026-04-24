import type { SiteSettings } from '@/src/server/admin/settings-service';

type SettingsRailProps = {
  settings: SiteSettings;
};

type SettingFieldProps = {
  label: string;
  value: string;
};

function SettingField({ label, value }: SettingFieldProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
      <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">{label}</dt>
      <dd className="mt-2 break-all text-sm text-slate-100">{value}</dd>
    </div>
  );
}

export function SettingsRail({ settings }: SettingsRailProps) {
  return (
    <section className="rounded-[28px] border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-50">Settings Rail</h2>
          <p className="mt-1 text-sm text-slate-400">Current site configuration stays visible at the bottom of the desk.</p>
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">updated {settings.updatedAt.replace('T', ' ').slice(0, 16)}</p>
      </div>

      <dl className="mt-5 grid gap-4 lg:grid-cols-5">
        <SettingField label="displaySiteName" value={settings.displaySiteName} />
        <SettingField label="successRedirectUrl" value={settings.successRedirectUrl} />
        <SettingField label="audioAssetId" value={settings.audioAssetId ?? 'default /1.mp3'} />
        <SettingField label="totalRounds" value={String(settings.totalRounds)} />
        <SettingField label="requiredPassCount" value={String(settings.requiredPassCount)} />
      </dl>
    </section>
  );
}
