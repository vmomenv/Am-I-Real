import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import { AdminDualImageDesk } from '@/src/components/admin/AdminDualImageDesk';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh,
  }),
}));

vi.mock('@/src/components/admin/AssetColumn', () => ({
  AssetColumn: ({ title, onUploadFiles }: { title: string; onUploadFiles?: (files: File[]) => void }) => (
    <section>
      <h2>{title}</h2>
      <input
        aria-label={`${title} 上传`}
        multiple
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) {
            onUploadFiles?.(files);
          }
        }}
        type="file"
      />
    </section>
  ),
}));

vi.mock('@/src/components/admin/UploadDrawer', () => ({
  UploadDrawer: ({ onAudioUploadRequest }: { onAudioUploadRequest?: () => void }) => (
    <aside>
      <button onClick={onAudioUploadRequest} type="button">
        上传音频素材
      </button>
    </aside>
  ),
}));

type SettingsRailProps = {
  values: {
    displaySiteName: string;
    successRedirectUrl: string;
    audioAssetId: string | null;
    totalRounds: string;
    requiredPassCount: string;
  };
  availableAudioOptions: Array<{ label: string; value: string | null }>;
  status: {
    isSaving: boolean;
    isUploadingAudio: boolean;
    error: string | null;
    success: string | null;
  };
  onFieldChange: (field: string, value: string) => void;
  onSave: () => void;
  onAudioUpload: (file: File) => void;
};

vi.mock('@/src/components/admin/SettingsRail', () => ({
  SettingsRail: ({ values, availableAudioOptions, status, onFieldChange, onSave, onAudioUpload }: SettingsRailProps) => (
    <section>
      <h2>站点配置</h2>
      <label htmlFor="displaySiteName">显示站点名</label>
      <input id="displaySiteName" onChange={(event) => onFieldChange('displaySiteName', event.target.value)} value={values.displaySiteName} />
      <label htmlFor="successRedirectUrl">成功跳转地址</label>
      <input id="successRedirectUrl" onChange={(event) => onFieldChange('successRedirectUrl', event.target.value)} value={values.successRedirectUrl} />
      <label htmlFor="audioAssetId">背景音乐</label>
      <select id="audioAssetId" onChange={(event) => onFieldChange('audioAssetId', event.target.value)} value={values.audioAssetId ?? ''}>
        <option value="">未选择</option>
        {availableAudioOptions.map((option) => (
          <option key={option.value ?? 'none'} value={option.value ?? ''}>
            {option.label}
          </option>
        ))}
      </select>
      <label htmlFor="totalRounds">总轮数</label>
      <input id="totalRounds" onChange={(event) => onFieldChange('totalRounds', event.target.value)} value={values.totalRounds} />
      <label htmlFor="requiredPassCount">通过轮数</label>
      <input id="requiredPassCount" onChange={(event) => onFieldChange('requiredPassCount', event.target.value)} value={values.requiredPassCount} />
      <input
        aria-label="上传音频文件"
        id="upload-audio"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onAudioUpload(file);
          }
        }}
        type="file"
      />
      <button disabled={status.isSaving} onClick={onSave} type="button">
        {status.isSaving ? '保存中...' : '保存配置'}
      </button>
      <p>{status.isUploadingAudio ? '音频上传中...' : '音频待命'}</p>
      {status.error ? <p>{status.error}</p> : null}
      {status.success ? <p>{status.success}</p> : null}
    </section>
  ),
}));

const aiAsset = {
  id: 'ai-1',
  kind: 'ai' as const,
  filePath: 'uploads/ai/ai-1.webp',
  originalFilename: 'nebula.webp',
  mimeType: 'image/webp',
  width: 1280,
  height: 720,
  fileSize: 120000,
  isActive: true,
  createdAt: '2026-04-24 10:00:00',
  updatedAt: '2026-04-24 10:00:00',
};

const realAsset = {
  id: 'real-1',
  kind: 'real' as const,
  filePath: 'uploads/real/real-1.jpg',
  originalFilename: 'portrait.jpg',
  mimeType: 'image/jpeg',
  width: 1280,
  height: 720,
  fileSize: 98000,
  isActive: true,
  createdAt: '2026-04-24 10:02:00',
  updatedAt: '2026-04-24 10:02:00',
};

const baseSettings = {
  id: 'default',
  displaySiteName: 'www.spark-app.store',
  successRedirectUrl: 'https://www.spark-app.store',
  audioAssetId: null,
  totalRounds: 10,
  requiredPassCount: 7,
  updatedAt: '2026-04-24 10:05:00',
  audioUrl: '/1.mp3',
};

describe('AdminDualImageDesk', () => {
  beforeEach(() => {
    refresh.mockReset();
  });

  it('renders the Chinese operations console header and editable configuration fields', () => {
    render(
      <AdminDualImageDesk
        aiAssets={[aiAsset]}
        onSaveSettings={vi.fn()}
        onUploadAudio={vi.fn()}
        realAssets={[realAsset]}
        settings={baseSettings}
      />,
    );

    expect(screen.getByText('当前管理员')).toBeInTheDocument();
    expect(screen.getByText('最近保存时间')).toBeInTheDocument();
    expect(screen.getByText('素材上传')).toBeInTheDocument();
    expect(screen.getByText('请使用左右图片池内的上传按钮')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '退出登录' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'AI 图片池' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '真实图片池' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '站点配置' })).toBeInTheDocument();
    expect(screen.getByLabelText('显示站点名')).toHaveValue('www.spark-app.store');
    expect(screen.getByLabelText('成功跳转地址')).toHaveValue('https://www.spark-app.store');
    expect(screen.getByLabelText('背景音乐')).toHaveValue('');
    expect(screen.getByLabelText('总轮数')).toHaveValue('10');
    expect(screen.getByLabelText('通过轮数')).toHaveValue('7');
    expect(screen.getByRole('button', { name: '保存配置' })).toBeInTheDocument();
  });

  it('submits edited settings and shows a success message', async () => {
    const onSaveSettings = vi.fn().mockResolvedValue({
      settings: {
        ...baseSettings,
        displaySiteName: '控制台站点',
        successRedirectUrl: 'https://console.example/success',
        audioAssetId: 'audio-2',
        audioUrl: '/uploads/audio/anthem.mp3',
        requiredPassCount: 8,
      },
    });

    render(
      <AdminDualImageDesk
        aiAssets={[aiAsset]}
        onSaveSettings={onSaveSettings}
        onUploadAudio={vi.fn()}
        realAssets={[realAsset]}
        settings={baseSettings}
      />,
    );

    fireEvent.change(screen.getByLabelText('显示站点名'), {
      target: { value: '控制台站点' },
    });
    fireEvent.change(screen.getByLabelText('成功跳转地址'), {
      target: { value: 'https://console.example/success' },
    });
    fireEvent.change(screen.getByLabelText('总轮数'), {
      target: { value: '10' },
    });
    fireEvent.change(screen.getByLabelText('通过轮数'), {
      target: { value: '8' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存配置' }));

    await waitFor(() => {
      expect(onSaveSettings).toHaveBeenCalledWith({
        audioAssetId: null,
        displaySiteName: '控制台站点',
        requiredPassCount: 8,
        successRedirectUrl: 'https://console.example/success',
        totalRounds: 10,
      });
    });

    expect(await screen.findByText('配置已保存。')).toBeInTheDocument();
    expect(screen.getByLabelText('显示站点名')).toHaveValue('控制台站点');
    expect(screen.getByLabelText('通过轮数')).toHaveValue('8');
    expect(refresh).toHaveBeenCalled();
  });

  it('uploads audio, refreshes available options, and reports errors', async () => {
    const audioFile = new File(['audio'], 'anthem.mp3', { type: 'audio/mpeg' });
    const onUploadAudio = vi.fn()
      .mockResolvedValueOnce({
        option: {
          label: 'anthem.mp3',
          value: 'audio-2',
        },
      })
      .mockRejectedValueOnce(new Error('上传失败，请重试。'));

    render(
      <AdminDualImageDesk
        aiAssets={[aiAsset]}
        onSaveSettings={vi.fn()}
        onUploadAudio={onUploadAudio}
        realAssets={[realAsset]}
        settings={baseSettings}
      />,
    );

    fireEvent.change(screen.getByLabelText('上传音频文件'), {
      target: { files: [audioFile] },
    });

    await waitFor(() => {
      expect(onUploadAudio).toHaveBeenCalledWith(audioFile);
    });

    expect(await screen.findByText('音频上传成功。')).toBeInTheDocument();
    expect(screen.getByLabelText('背景音乐')).toHaveValue('audio-2');

    fireEvent.change(screen.getByLabelText('上传音频文件'), {
      target: { files: [audioFile] },
    });

    expect(await screen.findByText('上传失败，请重试。')).toBeInTheDocument();
  });
});
