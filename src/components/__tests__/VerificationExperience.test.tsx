import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import { VerificationExperience } from '../VerificationExperience';

describe('VerificationExperience', () => {
  it('loads config, starts a challenge, submits a selection, and updates status', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({
          brandName: 'Groundflare',
          displaySiteName: 'www.spark-app.store',
          successRedirectUrl: 'https://www.spark-app.store',
          audioUrl: '/1.mp3',
          totalRounds: 10,
          requiredPassCount: 7,
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          brandName: 'Groundflare',
          displaySiteName: 'www.spark-app.store',
          successRedirectUrl: 'https://www.spark-app.store',
          audioUrl: '/1.mp3',
          totalRounds: 10,
          requiredPassCount: 7,
          sessionId: 'session-1',
          currentRoundIndex: 1,
          round: {
            roundId: 'round-1',
            prompt: '请选择唯一真实照片',
            options: Array.from({ length: 9 }, (_, index) => ({
              id: `round-1-option-${index + 1}`,
              imageUrl: `https://example.com/round-1-${index + 1}.jpg`,
              alt: `Round 1 candidate ${index + 1}`,
            })),
          },
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          status: 'continue',
          correctCount: 0,
          mistakeCount: 1,
          remainingMistakesBeforeFailure: 3,
          currentRoundIndex: 2,
          round: {
            roundId: 'round-2',
            prompt: '请选择唯一真实照片',
            options: Array.from({ length: 9 }, (_, index) => ({
              id: `round-2-option-${index + 1}`,
              imageUrl: `https://example.com/round-2-${index + 1}.jpg`,
              alt: `Round 2 candidate ${index + 1}`,
            })),
          },
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    render(<VerificationExperience />);

    expect(await screen.findByText('www.spark-app.store')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '开始验证' }));

    expect(await screen.findByText('第 1 / 10 轮')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Round 1 candidate 2' }));
    fireEvent.click(screen.getByRole('button', { name: '提交' }));

    await waitFor(() => {
      expect(screen.getByText('已答错 1 题')).toBeInTheDocument();
      expect(screen.getByText('剩余 3 次机会')).toBeInTheDocument();
      expect(screen.getByText('第 2 / 10 轮')).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
});
