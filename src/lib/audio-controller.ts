export interface AudioControllerPort {
  start: (src: string) => Promise<void>;
  stop: () => Promise<void>;
}

const FADE_INTERVAL_MS = 50;
const TARGET_VOLUME = Math.pow(10, -15 / 20);
const VOLUME_STEP = 0.05;

export class ChallengeAudioController implements AudioControllerPort {
  private fadeIntervalId: number | null = null;

  constructor(private readonly audio: HTMLAudioElement = new Audio()) {}

  async start(src: string) {
    this.clearFade();
    this.audio.src = src;
    this.audio.currentTime = 0;
    this.audio.loop = true;
    this.audio.volume = 0;

    await this.audio.play();
    void this.fadeTo(TARGET_VOLUME);
  }

  async stop() {
    this.clearFade();

    if (this.audio.volume <= 0) {
      this.audio.pause();
      this.audio.currentTime = 0;
      return;
    }

    void this.fadeTo(0, () => {
      this.audio.pause();
      this.audio.currentTime = 0;
    });
  }

  private fadeTo(targetVolume: number, onComplete?: () => void) {
    return new Promise<void>((resolve) => {
      this.fadeIntervalId = window.setInterval(() => {
        const difference = targetVolume - this.audio.volume;
        const direction = Math.sign(difference);

        if (Math.abs(difference) <= VOLUME_STEP) {
          this.audio.volume = targetVolume;
          this.clearFade();
          onComplete?.();
          resolve();
          return;
        }

        const nextVolume = this.audio.volume + direction * VOLUME_STEP;

        if (
          (direction > 0 && nextVolume >= targetVolume) ||
          (direction < 0 && nextVolume <= targetVolume)
        ) {
          this.audio.volume = targetVolume;
          this.clearFade();
          onComplete?.();
          resolve();
          return;
        }

        this.audio.volume = Math.max(0, Math.min(1, nextVolume));
      }, FADE_INTERVAL_MS);
    });
  }

  private clearFade() {
    if (this.fadeIntervalId === null) {
      return;
    }

    window.clearInterval(this.fadeIntervalId);
    this.fadeIntervalId = null;
  }
}
