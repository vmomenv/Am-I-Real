export type ChallengeViewState =
  | 'loading'
  | 'readyToVerify'
  | 'inChallenge'
  | 'submitting'
  | 'passed'
  | 'failed'
  | 'expired'
  | 'error';

export interface PublicChallengeConfig {
  brandName: string;
  displaySiteName: string;
  successRedirectUrl: string;
  audioUrl: string;
  totalRounds: number;
  requiredPassCount: number;
}

export interface ChallengeOption {
  id: string;
  imageUrl: string;
  alt: string;
}

export interface PublicRound {
  roundId: string;
  prompt: string;
  options: ChallengeOption[];
}

export interface InternalRound extends PublicRound {
  correctOptionId: string;
}

export interface ChallengeStartResponse extends PublicChallengeConfig {
  sessionId: string;
  currentRoundIndex: number;
  round: PublicRound;
}

export interface ChallengeAnswerRequest {
  sessionId: string;
  roundId: string;
  selectedOptionId: string;
}

export interface ContinueAnswerResponse {
  status: 'continue';
  correctCount: number;
  mistakeCount: number;
  remainingMistakesBeforeFailure: number;
  currentRoundIndex: number;
  round: PublicRound;
}

export interface PassedAnswerResponse {
  status: 'passed';
  correctCount: number;
  mistakeCount: number;
  redirectUrl: string;
}

export interface FailedAnswerResponse {
  status: 'failed';
  correctCount: number;
  mistakeCount: number;
  message: string;
}

export interface ExpiredAnswerResponse {
  status: 'expired';
  message: string;
}

export type ChallengeAnswerResponse =
  | ContinueAnswerResponse
  | PassedAnswerResponse
  | FailedAnswerResponse
  | ExpiredAnswerResponse;
