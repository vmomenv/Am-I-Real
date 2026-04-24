import type {
  ChallengeAnswerRequest,
  ChallengeAnswerResponse,
  ChallengeStartResponse,
  PublicChallengeConfig,
} from '@/src/lib/challenge-types';

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string,
    message?: string,
  ) {
    super(message ?? 'API request failed');
    this.name = 'ApiClientError';
  }
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function readJsonOrThrow(response: Response) {
  const payload = await response.json();

  if (response.ok === false) {
    throw new ApiClientError(response.status, payload?.code, payload?.message);
  }

  return payload;
}

export async function fetchPublicConfig() {
  const response = await fetch('/api/challenge/config');

  return readJson<PublicChallengeConfig>(response);
}

export async function startChallenge() {
  const response = await fetch('/api/challenge/start', {
    method: 'POST',
  });

  return (await readJsonOrThrow(response)) as ChallengeStartResponse;
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
