import { fireEvent, render, screen, within } from '@testing-library/react';

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
    const searchChanges: string[] = [];
    const sortChanges: string[] = [];
    const filterChanges: Array<'all' | 'active' | 'inactive'> = [];
    const uploadedKinds: string[] = [];

    render(
      <div>
        <AssetColumn
          assets={[{ ...baseAsset, id: 'ai-1', kind: 'ai', isActive: true }]}
          description="Synthetic candidates available for challenge generation and review."
          filterValue="all"
          onDeleteAsset={() => undefined}
          onRenameAsset={() => undefined}
          onSearchChange={(value) => searchChanges.push(value)}
          onSortChange={(value) => sortChanges.push(value)}
          onToggleAsset={() => undefined}
          onUploadFiles={(files) => uploadedKinds.push(`ai:${files.map((file) => file.name).join(',')}`)}
          searchValue=""
          sortValue="latest"
          title="AI Image Pool"
        />
        <AssetColumn
          assets={[{ ...baseAsset, id: 'real-1', kind: 'real', isActive: false }]}
          description="Verified human photography that anchors the real-photo challenge pool."
          filterValue="all"
          onDeleteAsset={() => undefined}
          onFilterChange={(value) => filterChanges.push(value)}
          onRenameAsset={() => undefined}
          onSearchChange={(value) => searchChanges.push(value)}
          onSortChange={(value) => sortChanges.push(value)}
          onToggleAsset={() => undefined}
          onUploadFiles={(files) => uploadedKinds.push(`real:${files.map((file) => file.name).join(',')}`)}
          searchValue=""
          sortValue="latest"
          title="Real Photo Pool"
        />
      </div>,
    );

    expect(screen.getByRole('heading', { name: 'AI 图片资产池' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '真人图片资产池' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '上传图片' })).toHaveLength(2);
    expect(screen.getAllByRole('searchbox', { name: '搜索素材' })).toHaveLength(2);
    expect(screen.getAllByRole('combobox', { name: '排序方式' })).toHaveLength(2);
    expect(screen.getAllByRole('combobox', { name: '状态筛选' })).toHaveLength(2);
    expect(screen.queryByText('search shell')).not.toBeInTheDocument();
    expect(screen.queryByText('bulk actions later')).not.toBeInTheDocument();

    fireEvent.change(screen.getAllByRole('searchbox', { name: '搜索素材' })[0], {
      target: { value: 'alpha' },
    });
    fireEvent.change(screen.getAllByRole('combobox', { name: '排序方式' })[0], {
      target: { value: 'name-asc' },
    });
    fireEvent.change(screen.getAllByRole('combobox', { name: '状态筛选' })[1], {
      target: { value: 'inactive' },
    });
    fireEvent.change(screen.getAllByLabelText('上传图片')[0], {
      target: {
        files: [
          new File(['ai-a'], 'ai-a.png', { type: 'image/png' }),
          new File(['ai-b'], 'ai-b.png', { type: 'image/png' }),
        ],
      },
    });
    fireEvent.change(screen.getAllByLabelText('上传图片')[1], {
      target: {
        files: [new File(['real-a'], 'real-a.png', { type: 'image/png' })],
      },
    });

    expect(searchChanges).toEqual(['alpha']);
    expect(sortChanges).toEqual(['name-asc']);
    expect(filterChanges).toEqual(['inactive']);
    expect(uploadedKinds).toEqual(['ai:ai-a.png,ai-b.png', 'real:real-a.png']);
  });

  it('renders Chinese asset status and action labels with live action hooks', () => {
    const renamedTo: string[] = [];
    const toggledIds: string[] = [];
    const deletedIds: string[] = [];

    render(
      <AssetCard
        asset={{ ...baseAsset, isActive: true }}
        onDelete={(asset) => deletedIds.push(asset.id)}
        onRename={(asset, nextName) => renamedTo.push(`${asset.id}:${nextName}`)}
        onToggle={(asset) => toggledIds.push(asset.id)}
      />,
    );

    expect(screen.getByText('已启用')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重命名' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '停用' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument();
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
    expect(screen.queryByText('Archive')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '重命名' }));
    fireEvent.change(screen.getByLabelText('新的素材名称'), {
      target: { value: 'renamed-portrait.jpg' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存名称' }));
    fireEvent.click(screen.getByRole('button', { name: '停用' }));
    fireEvent.click(screen.getByRole('button', { name: '删除' }));

    expect(renamedTo).toEqual(['asset-1:renamed-portrait.jpg']);
    expect(toggledIds).toEqual(['asset-1']);
    expect(deletedIds).toEqual(['asset-1']);
  });

  it('renders a Chinese upload operations drawer with live upload callbacks', () => {
    const uploads: string[] = [];

    render(
      <UploadDrawer
        onUploadAi={(file) => uploads.push(`ai:${file.name}`)}
        onUploadAudio={(file) => uploads.push(`audio:${file.name}`)}
        onUploadReal={(file) => uploads.push(`real:${file.name}`)}
      />,
    );

    const drawer = screen.getByRole('complementary');

    expect(within(drawer).getByRole('heading', { name: '上传图片' })).toBeInTheDocument();
    expect(within(drawer).getByText('上传队列')).toBeInTheDocument();
    expect(within(drawer).getByLabelText('上传 AI 图片')).toBeInTheDocument();
    expect(within(drawer).getByLabelText('上传真人图片')).toBeInTheDocument();
    expect(within(drawer).getByLabelText('上传音频素材')).toBeInTheDocument();
    expect(screen.queryByText('Upload Drawer')).not.toBeInTheDocument();
    expect(screen.queryByText('standby')).not.toBeInTheDocument();

    fireEvent.change(within(drawer).getByLabelText('上传 AI 图片'), {
      target: { files: [new File(['ai-bytes'], 'ai-sample.png', { type: 'image/png' })] },
    });
    fireEvent.change(within(drawer).getByLabelText('上传真人图片'), {
      target: { files: [new File(['real-bytes'], 'real-sample.png', { type: 'image/png' })] },
    });
    fireEvent.change(within(drawer).getByLabelText('上传音频素材'), {
      target: { files: [new File(['audio-bytes'], 'theme.mp3', { type: 'audio/mpeg' })] },
    });

    expect(uploads).toEqual(['ai:ai-sample.png', 'real:real-sample.png', 'audio:theme.mp3']);
  });
});
