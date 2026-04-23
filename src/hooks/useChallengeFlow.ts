import { useEffect, useState } from 'react';

import {
  fetchPublicConfig,
  startChallenge,
  submitChallengeAnswer,
} from '@/src/lib/api-client';
import type {
  ChallengeViewState,
  PublicChallengeConfig,
  PublicRound,
} from '@/src/lib/challenge-types';

interface ChallengeMetrics {
  currentRoundIndex: number;
  correctCount: number;
  mistakeCount: number;
  remainingMistakesBeforeFailure: number;
}

const EMPTY_METRICS: ChallengeMetrics = {
  currentRoundIndex: 0,
  correctCount: 0,
  mistakeCount: 0,
  remainingMistakesBeforeFailure: 0,
};

export function useChallengeFlow() {
  const [viewState, setViewState] = useState<ChallengeViewState>('loading');
  const [config, setConfig] = useState<PublicChallengeConfig | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [round, setRound] = useState<PublicRound | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ChallengeMetrics>(EMPTY_METRICS);

  useEffect(() => {
    let isActive = true;

    async function loadConfig() {
      try {
        const publicConfig = await fetchPublicConfig();

        if (!isActive) {
          return;
        }

        setConfig(publicConfig);
        setMetrics((current) => ({
          ...current,
          remainingMistakesBeforeFailure:
            publicConfig.totalRounds - publicConfig.requiredPassCount + 1,
        }));
        setViewState('readyToVerify');
      } catch {
        if (!isActive) {
          return;
        }

        setErrorMessage('加载验证配置失败，请稍后重试');
        setViewState('error');
      }
    }

    void loadConfig();

    return () => {
      isActive = false;
    };
  }, []);

  async function beginChallenge() {
    setErrorMessage(null);

    try {
      const response = await startChallenge();

      setConfig({
        brandName: response.brandName,
        displaySiteName: response.displaySiteName,
        successRedirectUrl: response.successRedirectUrl,
        audioUrl: response.audioUrl,
        totalRounds: response.totalRounds,
        requiredPassCount: response.requiredPassCount,
      });
      setSessionId(response.sessionId);
      setRound(response.round);
      setSelectedOptionId(null);
      setMetrics({
        currentRoundIndex: response.currentRoundIndex,
        correctCount: 0,
        mistakeCount: 0,
        remainingMistakesBeforeFailure:
          response.totalRounds - response.requiredPassCount + 1,
      });
      setViewState('inChallenge');
    } catch {
      setErrorMessage('启动验证失败，请稍后重试');
    }
  }

  async function submitSelection(submittedOptionId: string) {
    if (!sessionId || !round) {
      return;
    }

    setSelectedOptionId(submittedOptionId);
    setErrorMessage(null);
    setViewState('submitting');

    try {
      const response = await submitChallengeAnswer({
        sessionId,
        roundId: round.roundId,
        selectedOptionId: submittedOptionId,
      });

      if (response.status === 'continue') {
        setRound(response.round);
        setSelectedOptionId(null);
        setMetrics({
          currentRoundIndex: response.currentRoundIndex,
          correctCount: response.correctCount,
          mistakeCount: response.mistakeCount,
          remainingMistakesBeforeFailure: response.remainingMistakesBeforeFailure,
        });
        setViewState('inChallenge');
        return;
      }

      if (response.status === 'expired') {
        setSessionId(null);
        setRound(null);
        setSelectedOptionId(null);
        setMetrics((current) => ({
          ...EMPTY_METRICS,
          remainingMistakesBeforeFailure: current.remainingMistakesBeforeFailure,
        }));
        setErrorMessage(response.message);
        setViewState('readyToVerify');
        return;
      }

      setErrorMessage(
        response.status === 'failed' ? response.message : '验证通过，正在跳转',
      );
      setViewState(response.status);
    } catch {
      setErrorMessage('提交超时，请重试');
      setViewState('inChallenge');
    }
  }

  return {
    config,
    round,
    selectedOptionId,
    errorMessage,
    viewState,
    metrics,
    setSelectedOptionId,
    beginChallenge,
    submitSelection,
  };
}
