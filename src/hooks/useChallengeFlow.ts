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
import type { AudioControllerPort } from '@/src/lib/audio-controller';

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

interface UseChallengeFlowOptions {
  audioController?: AudioControllerPort;
}

export function useChallengeFlow({ audioController }: UseChallengeFlowOptions = {}) {
  const [viewState, setViewState] = useState<ChallengeViewState>('loading');
  const [config, setConfig] = useState<PublicChallengeConfig | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [round, setRound] = useState<PublicRound | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ChallengeMetrics>(EMPTY_METRICS);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  function getRemainingMistakes(activeConfig: PublicChallengeConfig | null) {
    if (!activeConfig) {
      return 0;
    }

    return activeConfig.totalRounds - activeConfig.requiredPassCount + 1;
  }

  function resetToShell(nextState: Extract<ChallengeViewState, 'readyToVerify' | 'expired'>) {
    setSessionId(null);
    setRound(null);
    setSelectedOptionId(null);
    setRedirectUrl(null);
    setMetrics({
      ...EMPTY_METRICS,
      remainingMistakesBeforeFailure: getRemainingMistakes(config),
    });
    setViewState(nextState);
  }

  function stopAudio() {
    if (!audioController) {
      return;
    }

    void audioController.stop().catch(() => undefined);
  }

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
    setRedirectUrl(null);

    if (config?.audioUrl) {
      void audioController?.start(config.audioUrl).catch(() => undefined);
    }

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
      stopAudio();
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
        stopAudio();
        setErrorMessage(response.message);
        resetToShell('expired');
        return;
      }

      stopAudio();
      setRedirectUrl(response.status === 'passed' ? response.redirectUrl : null);
      setErrorMessage(response.status === 'failed' ? response.message : null);
      setViewState(response.status);
    } catch {
      setErrorMessage('提交超时，请重试');
      setViewState('inChallenge');
    }
  }

  function restartChallenge() {
    stopAudio();
    setErrorMessage(null);
    resetToShell('readyToVerify');
  }

  return {
    config,
    round,
    selectedOptionId,
    redirectUrl,
    errorMessage,
    viewState,
    metrics,
    setSelectedOptionId,
    beginChallenge,
    submitSelection,
    restartChallenge,
  };
}
