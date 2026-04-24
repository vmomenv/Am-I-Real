'use client';

import type { ComponentProps, ComponentType } from 'react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import type { Asset } from '@/src/server/admin/assets-service';
import type { SiteSettings } from '@/src/server/admin/settings-service';

import { AssetColumn } from '@/src/components/admin/AssetColumn';
import {
  SettingsRail,
  type AudioOption,
  type SettingsFormValues,
} from '@/src/components/admin/SettingsRail';
import { UploadDrawer } from '@/src/components/admin/UploadDrawer';

type SaveSettingsInput = {
  displaySiteName: string;
  successRedirectUrl: string;
  audioAssetId: string | null;
  totalRounds: number;
  requiredPassCount: number;
};

type SaveSettingsResult = {
  settings: SiteSettings;
};

type UploadAudioResult = {
  option: AudioOption;
};

type AdminDualImageDeskProps = {
  aiAssets: Asset[];
  realAssets: Asset[];
  settings: SiteSettings;
  onSaveSettings: (input: SaveSettingsInput) => Promise<SaveSettingsResult>;
  onUploadAudio: (file: File) => Promise<UploadAudioResult>;
};

type AssetColumnCallbacksProps = ComponentProps<typeof AssetColumn> & {
  onUploadRequest?: () => void;
};

type UploadDrawerCallbacksProps = ComponentProps<typeof UploadDrawer> & {
  onAiUploadRequest?: () => void;
  onRealUploadRequest?: () => void;
  onAudioUploadRequest?: () => void;
};

const AssetColumnWithCallbacks = AssetColumn as unknown as ComponentType<AssetColumnCallbacksProps>;
const UploadDrawerWithCallbacks = UploadDrawer as unknown as ComponentType<UploadDrawerCallbacksProps>;

function formatUpdatedAt(updatedAt: string) {
  return updatedAt.replace('T', ' ').slice(0, 16);
}

function toInitialValues(settings: SiteSettings): SettingsFormValues {
  return {
    displaySiteName: settings.displaySiteName,
    successRedirectUrl: settings.successRedirectUrl,
    audioAssetId: settings.audioAssetId,
    totalRounds: String(settings.totalRounds),
    requiredPassCount: String(settings.requiredPassCount),
  };
}

function createDefaultAudioOption(settings: SiteSettings): AudioOption {
  return {
    label: settings.audioAssetId ? `当前音频 ${settings.audioUrl}` : `默认音频 ${settings.audioUrl}`,
    value: settings.audioAssetId,
  };
}

function mergeAudioOptions(options: AudioOption[]) {
  const seen = new Set<string>();

  return options.filter((option) => {
    const key = option.value ?? '__default__';

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function AdminDualImageDesk({
  aiAssets,
  realAssets,
  settings,
  onSaveSettings,
  onUploadAudio,
}: AdminDualImageDeskProps) {
  const router = useRouter();
  const aiReadyCount = aiAssets.filter((asset) => asset.isActive).length;
  const realReadyCount = realAssets.filter((asset) => asset.isActive).length;
  const [formValues, setFormValues] = useState<SettingsFormValues>(() => toInitialValues(settings));
  const [audioOptions, setAudioOptions] = useState<AudioOption[]>(() => [createDefaultAudioOption(settings)]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();
  const [isUploadingAudio, startUploadTransition] = useTransition();

  const updatedAtLabel = formatUpdatedAt(settings.updatedAt);

  function handleFieldChange(field: keyof SettingsFormValues, value: string) {
    setFormValues((current) => ({
      ...current,
      [field]: field === 'audioAssetId' ? value || null : value,
    }));
  }

  function handleSave() {
    setErrorMessage(null);
    setSuccessMessage(null);

    startSaveTransition(() => {
      void onSaveSettings({
        displaySiteName: formValues.displaySiteName,
        successRedirectUrl: formValues.successRedirectUrl,
        audioAssetId: formValues.audioAssetId,
        totalRounds: Number(formValues.totalRounds),
        requiredPassCount: Number(formValues.requiredPassCount),
      })
        .then(({ settings: nextSettings }) => {
          setFormValues(toInitialValues(nextSettings));
          setAudioOptions((current) =>
            mergeAudioOptions([createDefaultAudioOption(nextSettings), ...current]),
          );
          setSuccessMessage('配置已保存。');
          router.refresh();
        })
        .catch((error: unknown) => {
          setErrorMessage(getErrorMessage(error, '保存失败，请重试。'));
        });
    });
  }

  function handleAudioUpload(file: File) {
    setErrorMessage(null);
    setSuccessMessage(null);

    startUploadTransition(() => {
      void onUploadAudio(file)
        .then(({ option }) => {
          setAudioOptions((current) => mergeAudioOptions([option, ...current]));
          setFormValues((current) => ({
            ...current,
            audioAssetId: option.value,
          }));
          setSuccessMessage('音频上传成功。');
          router.refresh();
        })
        .catch((error: unknown) => {
          setErrorMessage(getErrorMessage(error, '上传音频失败，请重试。'));
        });
    });
  }

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
              <p className="mt-2 text-base text-slate-50">{updatedAtLabel}</p>
            </div>
            <button
              aria-label="快速上传"
              className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-left transition hover:border-emerald-400 hover:bg-emerald-500/15"
              onClick={() => undefined}
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
        <AssetColumnWithCallbacks
          assets={aiAssets}
          description="用于挑战编排与巡检的 AI 候选图片。"
          onUploadRequest={() => undefined}
          title="AI 图片池"
        />
        <AssetColumnWithCallbacks
          assets={realAssets}
          description="已核验的真实摄影素材，用于保持挑战题库平衡。"
          onUploadRequest={() => undefined}
          title="真实图片池"
        />
        <UploadDrawerWithCallbacks onAudioUploadRequest={() => undefined} />
      </div>

      <SettingsRail
        availableAudioOptions={audioOptions}
        onAudioUpload={handleAudioUpload}
        onFieldChange={handleFieldChange}
        onSave={handleSave}
        status={{
          error: errorMessage,
          isSaving,
          isUploadingAudio,
          success: successMessage,
        }}
        updatedAtLabel={updatedAtLabel}
        values={formValues}
      />
    </div>
  );
}
