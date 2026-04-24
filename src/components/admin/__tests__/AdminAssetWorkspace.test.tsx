import { render, screen, within } from '@testing-library/react';

import { AssetCard } from '@/src/components/admin/AssetCard';
import { AssetColumn } from '@/src/components/admin/AssetColumn';
import { UploadDrawer } from '@/src/components/admin/UploadDrawer';

const baseAsset = {
  id: 'asset-1',
  kind: 'real' as const,
  filePath: 'uploads/real/portrait.jpg',
  originalFilename: 'portrait.jpg',
  mimeType: 'image/jpeg',
  width: 1280,
  height: 720,
  fileSize: 98_000,
  createdAt: '2026-04-24T10:02:00',
  updatedAt: '2026-04-24T10:02:00',
};

describe('admin asset workspace components', () => {
  it('renders both asset columns with Chinese operator copy and upload actions', () => {
    render(
      <div>
        <AssetColumn
          assets={[{ ...baseAsset, id: 'ai-1', kind: 'ai', isActive: true }]}
          description="Synthetic candidates available for challenge generation and review."
          title="AI Image Pool"
        />
        <AssetColumn
          assets={[{ ...baseAsset, id: 'real-1', kind: 'real', isActive: false }]}
          description="Verified human photography that anchors the real-photo challenge pool."
          title="Real Photo Pool"
        />
      </div>,
    );

    expect(screen.getByRole('heading', { name: 'AI 图片资产池' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '真人图片资产池' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '上传图片' })).toHaveLength(2);
    expect(screen.queryByText('search shell')).not.toBeInTheDocument();
    expect(screen.queryByText('bulk actions later')).not.toBeInTheDocument();
  });

  it('renders Chinese asset status and action labels', () => {
    render(<AssetCard asset={{ ...baseAsset, isActive: true }} />);

    expect(screen.getByText('已启用')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重命名' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '停用' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument();
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
    expect(screen.queryByText('Archive')).not.toBeInTheDocument();
  });

  it('renders a Chinese upload operations drawer without placeholder copy', () => {
    render(<UploadDrawer />);

    const drawer = screen.getByRole('complementary');

    expect(within(drawer).getByRole('heading', { name: '上传图片' })).toBeInTheDocument();
    expect(within(drawer).getByText('上传队列')).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: '上传 AI 图片' })).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: '上传真人图片' })).toBeInTheDocument();
    expect(screen.queryByText('Upload Drawer')).not.toBeInTheDocument();
    expect(screen.queryByText('standby')).not.toBeInTheDocument();
  });
});
