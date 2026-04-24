import { render, screen } from '@testing-library/react';

import { AdminDualImageDesk } from '@/src/components/admin/AdminDualImageDesk';

describe('AdminDualImageDesk', () => {
  it('renders the AI and real asset columns with the current settings rail', () => {
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

    expect(screen.getByRole('heading', { name: 'AI Image Pool' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Real Photo Pool' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Settings Rail' })).toBeInTheDocument();
    expect(screen.getByText('displaySiteName')).toBeInTheDocument();
    expect(screen.getByText('successRedirectUrl')).toBeInTheDocument();
    expect(screen.getByText('audioAssetId')).toBeInTheDocument();
    expect(screen.getByText('totalRounds')).toBeInTheDocument();
    expect(screen.getByText('requiredPassCount')).toBeInTheDocument();
  });
});
