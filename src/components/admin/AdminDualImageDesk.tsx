'use client';

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

type AssetMutationResponse = {
  asset: Asset;
  message?: string;
};

type AssetMutationRequest = {
  method: 'POST' | 'PATCH' | 'DELETE';
  path: '/api/admin/assets/upload' | `/api/admin/assets/${string}`;
  body?: FormData | string;
};

type AdminDualImageDeskProps = {
  aiAssets: Asset[];
  realAssets: Asset[];
  settings: SiteSettings;
  onSaveSettings: (input: SaveSettingsInput) => Promise<SaveSettingsResult>;
  onUploadAudio: (file: File) => Promise<UploadAudioResult>;
};

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

function getPayloadMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object' || !('message' in payload)) {
    return null;
  }

  const { message } = payload as { message?: unknown };

  return typeof message === 'string' ? message : null;
}

function filterAndSortAssets(
  assets: Asset[],
  query: string,
  filter: 'all' | 'active' | 'inactive',
  sort: 'latest' | 'oldest' | 'name-asc' | 'name-desc',
) {
  const normalizedQuery = query.trim().toLowerCase();

  return assets
    .filter((asset) => {
      if (filter === 'active' && !asset.isActive) {
        return false;
      }

      if (filter === 'inactive' && asset.isActive) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        asset.originalFilename.toLowerCase().includes(normalizedQuery) ||
        asset.id.toLowerCase().includes(normalizedQuery)
      );
    })
    .sort((left, right) => {
      if (sort === 'oldest') {
        return left.createdAt.localeCompare(right.createdAt);
      }

      if (sort === 'name-asc') {
        return left.originalFilename.localeCompare(right.originalFilename, 'zh-CN');
      }

      if (sort === 'name-desc') {
        return right.originalFilename.localeCompare(left.originalFilename, 'zh-CN');
      }

      return right.createdAt.localeCompare(left.createdAt);
    });
}

export function AdminDualImageDesk({
  aiAssets,
  realAssets,
  settings,
  onSaveSettings,
  onUploadAudio,
}: AdminDualImageDeskProps) {
  const router = useRouter();
  const [aiAssetState, setAiAssetState] = useState(aiAssets);
  const [realAssetState, setRealAssetState] = useState(realAssets);
  const [formValues, setFormValues] = useState<SettingsFormValues>(() => toInitialValues(settings));
  const [audioOptions, setAudioOptions] = useState<AudioOption[]>(() => [createDefaultAudioOption(settings)]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [aiSearchValue, setAiSearchValue] = useState('');
  const [realSearchValue, setRealSearchValue] = useState('');
  const [aiFilterValue, setAiFilterValue] = useState<'all' | 'active' | 'inactive'>('all');
  const [realFilterValue, setRealFilterValue] = useState<'all' | 'active' | 'inactive'>('all');
  const [aiSortValue, setAiSortValue] = useState<'latest' | 'oldest' | 'name-asc' | 'name-desc'>('latest');
  const [realSortValue, setRealSortValue] = useState<'latest' | 'oldest' | 'name-asc' | 'name-desc'>('latest');
  const [isSaving, startSaveTransition] = useTransition();
  const [isUploadingAudio, startUploadTransition] = useTransition();
  const [isMutatingAssets, startAssetTransition] = useTransition();

  const aiReadyCount = aiAssetState.filter((asset) => asset.isActive).length;
  const realReadyCount = realAssetState.filter((asset) => asset.isActive).length;
  const visibleAiAssets = filterAndSortAssets(aiAssetState, aiSearchValue, aiFilterValue, aiSortValue);
  const visibleRealAssets = filterAndSortAssets(realAssetState, realSearchValue, realFilterValue, realSortValue);

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

  async function requestAssetMutation(input: AssetMutationRequest, fallbackMessage: string) {
    const response = await fetch(input.path, {
      method: input.method,
      body: input.body,
      headers:
        input.body instanceof FormData
          ? { accept: 'application/json' }
          : typeof input.body === 'string'
            ? {
                accept: 'application/json',
                'content-type': 'application/json',
              }
          : {
              accept: 'application/json',
            },
    });

    const payload = (await response.json()) as unknown;

    if (!response.ok) {
      throw new Error(getPayloadMessage(payload) ?? fallbackMessage);
    }

    return payload as AssetMutationResponse;
  }

  function updateAssetCollection(kind: Asset['kind'], updater: (current: Asset[]) => Asset[]) {
    if (kind === 'ai') {
      setAiAssetState(updater);
      return;
    }

    if (kind === 'real') {
      setRealAssetState(updater);
    }
  }

  function handleAssetUpload(kind: 'ai' | 'real') {
    return (files: File[]) => {
      setErrorMessage(null);
      setSuccessMessage(null);

      startAssetTransition(() => {
        void Promise.all(
          files.map(async (file) => {
            const formData = new FormData();
            formData.set('kind', kind);
            formData.set('file', file);

            const { asset } = await requestAssetMutation(
              {
                method: 'POST',
                path: '/api/admin/assets/upload',
                body: formData,
              },
              '上传图片失败，请重试。',
            );

            return asset;
          }),
        )
          .then((assets) => {
            updateAssetCollection(kind, (current) => [...assets, ...current]);
            setSuccessMessage(
              files.length === 1
                ? `${kind === 'ai' ? 'AI' : '真人'} 图片上传成功。`
                : `${files.length} 张${kind === 'ai' ? 'AI' : '真人'}图片上传成功。`,
            );
            router.refresh();
          })
          .catch((error: unknown) => {
            setErrorMessage(getErrorMessage(error, '上传图片失败，请重试。'));
          });
      });
    };
  }

  function handleAssetRename(asset: Asset, nextName: string) {
    setErrorMessage(null);
    setSuccessMessage(null);

    startAssetTransition(() => {
      void requestAssetMutation(
        {
          method: 'PATCH',
          path: `/api/admin/assets/${asset.id}`,
          body: JSON.stringify({ originalFilename: nextName }),
        },
        '重命名失败，请重试。',
      )
        .then(({ asset: updatedAsset }) => {
          updateAssetCollection(asset.kind, (current) =>
            current.map((item) => (item.id === updatedAsset.id ? updatedAsset : item)),
          );
          setSuccessMessage('素材名称已更新。');
          router.refresh();
        })
        .catch((error: unknown) => {
          setErrorMessage(getErrorMessage(error, '重命名失败，请重试。'));
        });
    });
  }

  function handleAssetToggle(asset: Asset) {
    setErrorMessage(null);
    setSuccessMessage(null);

    startAssetTransition(() => {
      void requestAssetMutation(
        {
          method: 'PATCH',
          path: `/api/admin/assets/${asset.id}`,
          body: JSON.stringify({ isActive: !asset.isActive }),
        },
        '更新素材状态失败，请重试。',
      )
        .then(({ asset: updatedAsset }) => {
          updateAssetCollection(asset.kind, (current) =>
            current.map((item) => (item.id === updatedAsset.id ? updatedAsset : item)),
          );
          setSuccessMessage(`素材已${updatedAsset.isActive ? '启用' : '停用'}。`);
          router.refresh();
        })
        .catch((error: unknown) => {
          setErrorMessage(getErrorMessage(error, '更新素材状态失败，请重试。'));
        });
    });
  }

  function handleAssetDelete(asset: Asset) {
    setErrorMessage(null);
    setSuccessMessage(null);

    startAssetTransition(() => {
      void requestAssetMutation(
        {
          method: 'DELETE',
          path: `/api/admin/assets/${asset.id}`,
        },
        '删除素材失败，请重试。',
      )
        .then(() => {
          updateAssetCollection(asset.kind, (current) => current.filter((item) => item.id !== asset.id));
          setSuccessMessage('素材已删除。');
          router.refresh();
        })
        .catch((error: unknown) => {
          setErrorMessage(getErrorMessage(error, '删除素材失败，请重试。'));
        });
    });
  }

  function handleLogout() {
    setErrorMessage(null);
    setSuccessMessage(null);

    startAssetTransition(() => {
      void fetch('/api/admin/auth/logout', {
        method: 'POST',
      })
        .then(() => {
          router.push('/admin/login');
          router.refresh();
        })
        .catch(() => {
          setErrorMessage('退出登录失败，请重试。');
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
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-left">
              <p className="text-xs tracking-[0.2em] text-emerald-300">素材上传</p>
              <p className="mt-2 text-base text-slate-50">请使用左右图片池内的上传按钮</p>
            </div>
            <button
              aria-label="退出登录"
              className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-left transition hover:border-rose-400/60 hover:bg-rose-500/10"
              disabled={isMutatingAssets}
              onClick={handleLogout}
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

      <div className="grid gap-6 xl:grid-cols-2">
        <AssetColumn
          assets={visibleAiAssets}
          description="用于挑战编排与巡检的 AI 候选图片。"
          filterValue={aiFilterValue}
          onDeleteAsset={handleAssetDelete}
          onFilterChange={setAiFilterValue}
          onRenameAsset={handleAssetRename}
          onSearchChange={setAiSearchValue}
          onSortChange={setAiSortValue}
          onToggleAsset={handleAssetToggle}
          onUploadFiles={handleAssetUpload('ai')}
          title="AI 图片池"
          searchValue={aiSearchValue}
          sortValue={aiSortValue}
        />
        <AssetColumn
          assets={visibleRealAssets}
          description="已核验的真实摄影素材，用于保持挑战题库平衡。"
          filterValue={realFilterValue}
          onDeleteAsset={handleAssetDelete}
          onFilterChange={setRealFilterValue}
          onRenameAsset={handleAssetRename}
          onSearchChange={setRealSearchValue}
          onSortChange={setRealSortValue}
          onToggleAsset={handleAssetToggle}
          onUploadFiles={handleAssetUpload('real')}
          title="真实图片池"
          searchValue={realSearchValue}
          sortValue={realSortValue}
        />
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
