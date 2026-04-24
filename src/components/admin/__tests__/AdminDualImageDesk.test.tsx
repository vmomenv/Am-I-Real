import { render, screen } from '@testing-library/react';

import { AdminDualImageDesk } from '@/src/components/admin/AdminDualImageDesk';

describe('AdminDualImageDesk', () => {
  it('renders the Chinese operations console header and editable configuration fields', () => {
    render(
      <AdminDualImageDesk
        aiAssets={[
          {
            id: 'ai-1',
            kind: 'ai',
            filePath: 'uploads/ai/ai-1.webp',
            originalFilename: 'nebula.webp',
            mimeType: 'image/webp',
            width: 1280,
            height: 720,
            fileSize: 120000,
            isActive: true,
            createdAt: '2026-04-24 10:00:00',
            updatedAt: '2026-04-24 10:00:00',
          },
        ]}
        realAssets={[
          {
            id: 'real-1',
            kind: 'real',
            filePath: 'uploads/real/real-1.jpg',
            originalFilename: 'portrait.jpg',
            mimeType: 'image/jpeg',
            width: 1280,
            height: 720,
            fileSize: 98000,
            isActive: true,
            createdAt: '2026-04-24 10:02:00',
            updatedAt: '2026-04-24 10:02:00',
          },
        ]}
        settings={{
          id: 'default',
          displaySiteName: 'www.spark-app.store',
          successRedirectUrl: 'https://www.spark-app.store',
          audioAssetId: null,
          totalRounds: 10,
          requiredPassCount: 7,
          updatedAt: '2026-04-24 10:05:00',
          audioUrl: '/1.mp3',
        }}
      />,
    );

    expect(screen.getByText('当前管理员')).toBeInTheDocument();
    expect(screen.getByText('最近保存时间')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '快速上传' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '退出登录' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'AI 图片池' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '真实图片池' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '站点配置' })).toBeInTheDocument();
    expect(screen.getByLabelText('显示站点名')).toHaveValue('www.spark-app.store');
    expect(screen.getByLabelText('成功跳转地址')).toHaveValue('https://www.spark-app.store');
    expect(screen.getByLabelText('背景音乐')).toHaveValue('/1.mp3');
    expect(screen.getByLabelText('总轮数')).toHaveValue(10);
    expect(screen.getByLabelText('通过轮数')).toHaveValue(7);
    expect(screen.getByRole('button', { name: '上传音频' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存配置' })).toBeInTheDocument();
  });
});
