import type {
  InternalRound,
  PublicChallengeConfig,
  PublicRound,
} from '@/src/lib/challenge-types';

export const PUBLIC_CHALLENGE_CONFIG: PublicChallengeConfig = {
  brandName: 'Groundflare',
  displaySiteName: 'www.spark-app.store',
  successRedirectUrl: 'https://www.spark-app.store',
  audioUrl: '/1.mp3',
  totalRounds: 10,
  requiredPassCount: 7,
};

const REAL_POSITIONS = [1, 4, 7, 2, 8, 0, 5, 3, 6, 4];

const REAL_PHOTO_URLS = Array.from({ length: 10 }, (_, index) => {
  return `https://picsum.photos/seed/groundflare-real-${index + 1}/512/512`;
});

const AI_IMAGE_URLS = Array.from({ length: 8 }, (_, index) => {
  return `https://placehold.co/512x512/e2e8f0/334155?text=AI+${index + 1}`;
});

export const MOCK_ROUNDS: InternalRound[] = REAL_POSITIONS.map((realPosition, roundIndex) => {
  const options = Array.from({ length: 9 }, (_, optionIndex) => {
    const id = `round-${roundIndex + 1}-option-${optionIndex + 1}`;
    const isReal = optionIndex === realPosition;

    return {
      id,
      imageUrl: isReal
        ? REAL_PHOTO_URLS[roundIndex]
        : `${AI_IMAGE_URLS[optionIndex % AI_IMAGE_URLS.length]}&round=${roundIndex + 1}`,
      alt: `Round ${roundIndex + 1} candidate ${optionIndex + 1}`,
    };
  });

  return {
    roundId: `round-${roundIndex + 1}`,
    prompt: '请选择唯一真实照片',
    correctOptionId: options[realPosition].id,
    options,
  };
});

export function toPublicRound(round: InternalRound): PublicRound {
  return {
    roundId: round.roundId,
    prompt: round.prompt,
    options: round.options,
  };
}
