import { useEffect, useRef, useState } from 'react';

import {
  ApiClientError,
  fetchPublicConfig,
  startChallenge,
  submitChallengeAnswer,
} from '@/src/lib/api-client';
import type {
  ChallengeViewState,
  PublicChallengeConfig,
  PublicRound,
} from '@/src/lib/challenge-types';
import { ChallengeAudioController } from '@/src/lib/audio-controller';
import type { AudioControllerPort } from '@/src/lib/audio-controller';

const PRECHECK_DELAY_MS = 1000;
const BEGIN_CHALLENGE_DELAY_MS = 1000;
const INVALID_CHALLENGE_POOL_MESSAGE = '验证资源尚未配置完成，请先上传并配置后端挑战素材后再试';

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
  beginChallengeDelayMs?: number;
  preCheckDelayMs?: number;
}

function wait(delayMs: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

export function useChallengeFlow({
  audioController,
  beginChallengeDelayMs = BEGIN_CHALLENGE_DELAY_MS,
  preCheckDelayMs = PRECHECK_DELAY_MS,
}: UseChallengeFlowOptions = {}) {
  const [viewState, setViewState] = useState<ChallengeViewState>('loading');
  const [config, setConfig] = useState<PublicChallengeConfig | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [round, setRound] = useState<PublicRound | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ChallengeMetrics>(EMPTY_METRICS);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const internalAudioControllerRef = useRef<AudioControllerPort | null>(audioController ?? null);
  const readyTimerRef = useRef<number | null>(null);

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

  function getAudioController() {
    if (audioController) {
      internalAudioControllerRef.current = audioController;
      return audioController;
    }

    if (internalAudioControllerRef.current) {
      return internalAudioControllerRef.current;
    }

    if (typeof Audio === 'undefined') {
      return null;
    }

    internalAudioControllerRef.current = new ChallengeAudioController();
    return internalAudioControllerRef.current;
  }

  function stopAudio() {
    const activeAudioController = getAudioController();

    if (!activeAudioController) {
      return;
    }

    void activeAudioController.stop().catch(() => undefined);
  }

  function clearReadyTimer() {
    if (readyTimerRef.current === null) {
      return;
    }

    window.clearTimeout(readyTimerRef.current);
    readyTimerRef.current = null;
  }

  function queueReadyToVerify() {
    clearReadyTimer();
    setViewState('loading');

    readyTimerRef.current = window.setTimeout(() => {
      setViewState('readyToVerify');
      readyTimerRef.current = null;
    }, preCheckDelayMs);
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
        queueReadyToVerify();
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
      clearReadyTimer();
    };
  }, []);

  async function beginChallenge() {
    setErrorMessage(null);
    setRedirectUrl(null);
    setViewState('loading');

    if (config?.audioUrl) {
      const activeAudioController = getAudioController();

      if (activeAudioController) {
        void activeAudioController.start(config.audioUrl).catch(() => undefined);
      }
    }

    try {
      const [response] = await Promise.all([startChallenge(), wait(beginChallengeDelayMs)]);

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
    } catch (error) {
      stopAudio();

      if (error instanceof ApiClientError && error.code === 'INVALID_CHALLENGE_POOL') {
        setErrorMessage(INVALID_CHALLENGE_POOL_MESSAGE);
        setViewState('readyToVerify');
        return;
      }

      setErrorMessage('启动验证失败，请稍后重试');
      setViewState('readyToVerify');
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
