'use client';

import { useRef } from 'react';

export type SettingsFormValues = {
  displaySiteName: string;
  successRedirectUrl: string;
  audioAssetId: string | null;
  totalRounds: string;
  requiredPassCount: string;
};

export type AudioOption = {
  label: string;
  value: string | null;
};

export type SettingsRailStatus = {
  isSaving: boolean;
  isUploadingAudio: boolean;
  error: string | null;
  success: string | null;
};

type SettingsRailProps = {
  values: SettingsFormValues;
  availableAudioOptions: AudioOption[];
  status: SettingsRailStatus;
  updatedAtLabel: string;
  onFieldChange: (field: keyof SettingsFormValues, value: string) => void;
  onSave: () => void;
  onAudioUpload: (file: File) => void;
};

type SettingInputProps = {
  label: string;
  value: string;
  type?: 'text' | 'url' | 'number';
  onChange: (value: string) => void;
};

function SettingInput({ label, value, type = 'text', onChange }: SettingInputProps) {
  const inputId = `settings-${label}`;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
      <label className="block" htmlFor={inputId}>
        <span className="text-xs tracking-[0.2em] text-slate-400">{label}</span>
      </label>
      <input
        className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400"
        id={inputId}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </div>
  );
}

export function SettingsRail({
  values,
  availableAudioOptions,
  status,
  updatedAtLabel,
  onFieldChange,
  onSave,
  onAudioUpload,
}: SettingsRailProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <section className="rounded-[28px] border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-50">站点配置</h2>
          <p className="mt-1 text-sm text-slate-400">在这里直接维护站点展示信息、跳转规则和背景音乐配置。</p>
        </div>
        <p className="text-xs tracking-[0.2em] text-slate-500">最近更新 {updatedAtLabel}</p>
      </div>

      <form
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <SettingInput
            label="显示站点名"
            onChange={(value) => onFieldChange('displaySiteName', value)}
            value={values.displaySiteName}
          />
          <SettingInput
            label="成功跳转地址"
            onChange={(value) => onFieldChange('successRedirectUrl', value)}
            type="url"
            value={values.successRedirectUrl}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
            <label className="block" htmlFor="settings-audioAssetId">
              <span className="text-xs tracking-[0.2em] text-slate-400">背景音乐</span>
            </label>
            <select
              className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-400"
              id="settings-audioAssetId"
              onChange={(event) => onFieldChange('audioAssetId', event.target.value)}
              value={values.audioAssetId ?? ''}
            >
              {availableAudioOptions.map((option) => (
                <option key={option.value ?? 'default-audio'} value={option.value ?? ''}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <input
              accept="audio/*"
              className="sr-only"
              id="settings-audio-upload"
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  onAudioUpload(file);
                  event.target.value = '';
                }
              }}
              ref={fileInputRef}
              type="file"
            />
            <button
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 transition hover:border-emerald-400 hover:text-emerald-300 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
              disabled={status.isUploadingAudio}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              {status.isUploadingAudio ? '上传中...' : '上传音频'}
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SettingInput
            label="总轮数"
            onChange={(value) => onFieldChange('totalRounds', value)}
            type="number"
            value={values.totalRounds}
          />
          <SettingInput
            label="通过轮数"
            onChange={(value) => onFieldChange('requiredPassCount', value)}
            type="number"
            value={values.requiredPassCount}
          />
        </div>

        {status.error ? (
          <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {status.error}
          </p>
        ) : null}

        {status.success ? (
          <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {status.success}
          </p>
        ) : null}

        <div className="flex justify-end border-t border-slate-800 pt-4">
          <button
            className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-sm text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
            disabled={status.isSaving}
            type="submit"
          >
            {status.isSaving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </form>
    </section>
  );
}
