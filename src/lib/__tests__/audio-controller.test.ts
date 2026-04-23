import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChallengeAudioController } from '../audio-controller';

describe('ChallengeAudioController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('fades audio in to 60 percent volume', async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    const audio = {
      currentTime: 12,
      loop: false,
      pause,
      play,
      src: '',
      volume: 1,
    } as unknown as HTMLAudioElement;

    const controller = new ChallengeAudioController(audio);

    await controller.start('/1.mp3');

    expect(play).toHaveBeenCalledTimes(1);
    expect(audio.src).toContain('/1.mp3');
    expect(audio.currentTime).toBe(0);
    expect(audio.loop).toBe(true);
    expect(audio.volume).toBeCloseTo(0, 2);

    await vi.advanceTimersByTimeAsync(650);

    expect(audio.volume).toBeCloseTo(0.6, 2);
    expect(pause).not.toHaveBeenCalled();
  });

  it('fades audio out and pauses playback', async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    const audio = {
      currentTime: 0,
      loop: false,
      pause,
      play,
      src: '',
      volume: 0.6,
    } as unknown as HTMLAudioElement;

    const controller = new ChallengeAudioController(audio);

    await controller.stop();
    await vi.advanceTimersByTimeAsync(650);

    expect(audio.volume).toBeCloseTo(0, 2);
    expect(audio.currentTime).toBe(0);
    expect(pause).toHaveBeenCalledTimes(1);
  });
});
