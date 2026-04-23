import type {
  ChallengeAnswerRequest,
  ChallengeAnswerResponse,
  ChallengeStartResponse,
  PublicChallengeConfig,
} from '@/src/lib/challenge-types';

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function fetchPublicConfig() {
  const response = await fetch('/api/challenge/config');

  return readJson<PublicChallengeConfig>(response);
}

export async function startChallenge() {
  const response = await fetch('/api/challenge/start', {
    method: 'POST',
  });

  return readJson<ChallengeStartResponse>(response);
}

export async function submitChallengeAnswer(payload: ChallengeAnswerRequest) {
  const response = await fetch('/api/challenge/answer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return readJson<ChallengeAnswerResponse>(response);
}
