import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import { VerificationExperience } from '../VerificationExperience';

function createConfigResponse() {
  return {
    brandName: 'Groundflare',
    displaySiteName: 'www.spark-app.store',
    successRedirectUrl: 'https://www.spark-app.store',
    audioUrl: '/1.mp3',
    totalRounds: 10,
    requiredPassCount: 7,
  };
}

function createRound(roundId: string, prefix: string) {
  return {
    roundId,
    prompt: '请选择唯一真实照片',
    options: Array.from({ length: 9 }, (_, index) => ({
      id: `${roundId}-option-${index + 1}`,
      imageUrl: `https://example.com/${prefix}-${index + 1}.jpg`,
      alt: `${prefix} candidate ${index + 1}`,
    })),
  };
}

describe('VerificationExperience', () => {
  it('loads config, starts a challenge, submits a selection, and updates status', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        json: async () => createConfigResponse(),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          ...createConfigResponse(),
          sessionId: 'session-1',
          currentRoundIndex: 1,
          round: createRound('round-1', 'Round 1'),
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          status: 'continue',
          correctCount: 0,
          mistakeCount: 1,
          remainingMistakesBeforeFailure: 3,
          currentRoundIndex: 2,
          round: createRound('round-2', 'Round 2'),
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    render(<VerificationExperience />);

    expect(await screen.findByText('www.spark-app.store')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '我是人类' }));

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

  it('replaces the active challenge grid after a failed submission', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        json: async () => createConfigResponse(),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          ...createConfigResponse(),
          sessionId: 'session-1',
          currentRoundIndex: 1,
          round: createRound('round-1', 'Round 1'),
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          status: 'failed',
          correctCount: 0,
          mistakeCount: 4,
          message: '你不是人类！',
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    render(<VerificationExperience />);

    expect(await screen.findByText('www.spark-app.store')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '我是人类' }));
    expect(await screen.findByText('第 1 / 10 轮')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Round 1 candidate 2' }));
    fireEvent.click(screen.getByRole('button', { name: '提交' }));

    expect(await screen.findByRole('heading', { name: '你不是人类！' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新验证' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '提交' })).not.toBeInTheDocument();
    expect(screen.queryByText('请选择唯一真实照片')).not.toBeInTheDocument();
  });

  it('shows the success state and redirects after a short delay', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        json: async () => createConfigResponse(),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          ...createConfigResponse(),
          sessionId: 'session-1',
          currentRoundIndex: 1,
          round: createRound('round-1', 'Round 1'),
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          status: 'passed',
          correctCount: 7,
          mistakeCount: 1,
          redirectUrl: 'https://www.spark-app.store/success',
        }),
      });

    const redirect = vi.fn();
    const audioController = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
    };

    vi.stubGlobal('fetch', fetchMock);

    render(
      <VerificationExperience
        audioController={audioController}
        onRedirect={redirect}
        redirectDelayMs={10}
      />,
    );

    expect(audioController.start).not.toHaveBeenCalled();

    expect(await screen.findByText('www.spark-app.store')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '我是人类' }));
    expect(audioController.start).toHaveBeenCalledWith('/1.mp3');

    fireEvent.click(await screen.findByRole('button', { name: 'Round 1 candidate 1' }));
    fireEvent.click(screen.getByRole('button', { name: '提交' }));

    expect(await screen.findByText('验证通过')).toBeInTheDocument();
    expect(audioController.stop).toHaveBeenCalledTimes(1);
    expect(redirect).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(redirect).toHaveBeenCalledWith('https://www.spark-app.store/success');
    });
  });

  it('keeps the selected option when answer submission times out', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        json: async () => createConfigResponse(),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          ...createConfigResponse(),
          sessionId: 'session-1',
          currentRoundIndex: 1,
          round: createRound('round-1', 'Round 1'),
        }),
      })
      .mockRejectedValueOnce(new Error('timeout'));

    vi.stubGlobal('fetch', fetchMock);

    render(<VerificationExperience />);

    fireEvent.click(await screen.findByRole('button', { name: '我是人类' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Round 1 candidate 4' }));
    fireEvent.click(screen.getByRole('button', { name: '提交' }));

    expect(await screen.findByText('提交超时，请重试')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Round 1 candidate 4' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: '提交' })).toBeEnabled();
  });

  it('returns to the shell when the session expires', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        json: async () => createConfigResponse(),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          ...createConfigResponse(),
          sessionId: 'session-1',
          currentRoundIndex: 1,
          round: createRound('round-1', 'Round 1'),
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          status: 'expired',
          message: '验证已过期，请重新开始',
        }),
      });

    const audioController = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
    };

    vi.stubGlobal('fetch', fetchMock);

    render(<VerificationExperience audioController={audioController} />);

    fireEvent.click(await screen.findByRole('button', { name: '我是人类' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Round 1 candidate 2' }));
    fireEvent.click(screen.getByRole('button', { name: '提交' }));

    expect(await screen.findByText('验证已过期，请重新开始')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '我是人类' })).toBeInTheDocument();
    expect(screen.queryByText('第 1 / 10 轮')).not.toBeInTheDocument();
    expect(audioController.stop).toHaveBeenCalledTimes(1);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});
