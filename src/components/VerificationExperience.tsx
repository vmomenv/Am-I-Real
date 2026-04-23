'use client';

import { useEffect } from 'react';

import { ChallengeCard } from '@/src/components/ChallengeCard';
import { ChallengeStatusPanel } from '@/src/components/ChallengeStatusPanel';
import { ResultCard } from '@/src/components/ResultCard';
import { VerificationShell } from '@/src/components/VerificationShell';
import { useChallengeFlow } from '@/src/hooks/useChallengeFlow';
import type { AudioControllerPort } from '@/src/lib/audio-controller';

const FALLBACK_CONFIG = {
  brandName: 'Groundflare',
  displaySiteName: 'www.spark-app.store',
  totalRounds: 10,
  requiredPassCount: 7,
};

const REDIRECT_DELAY_MS = 1500;

interface VerificationExperienceProps {
  audioController?: AudioControllerPort;
  onRedirect?: (url: string) => void;
  redirectDelayMs?: number;
  preCheckDelayMs?: number;
}

export function VerificationExperience({
  audioController,
  onRedirect,
  redirectDelayMs = REDIRECT_DELAY_MS,
  preCheckDelayMs,
}: VerificationExperienceProps) {
  const {
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
  } = useChallengeFlow({ audioController, preCheckDelayMs });

  const activeConfig = config ?? FALLBACK_CONFIG;

  useEffect(() => {
    if (viewState !== 'passed' || !redirectUrl) {
      return;
    }

    const timerId = window.setTimeout(() => {
      if (onRedirect) {
        onRedirect(redirectUrl);
        return;
      }

      window.location.assign(redirectUrl);
    }, redirectDelayMs);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [onRedirect, redirectDelayMs, redirectUrl, viewState]);

  if (
    viewState === 'loading' ||
    viewState === 'readyToVerify' ||
    viewState === 'expired' ||
    viewState === 'error'
  ) {
    return (
        <VerificationShell
          brandName={activeConfig.brandName}
          buttonDisabled={viewState === 'loading'}
          buttonLabel="我是人类"
          errorMessage={errorMessage}
          onAction={beginChallenge}
          siteName={activeConfig.displaySiteName}
        />
      );
  }

  if (viewState === 'passed' || viewState === 'failed') {
    return (
        <ResultCard
          actionLabel={viewState === 'failed' ? '重新验证' : undefined}
          brandName={activeConfig.brandName}
          message={viewState === 'passed' ? '系统已确认当前验证会话通过，正在跳转到目标站点。' : errorMessage}
          onAction={viewState === 'failed' ? restartChallenge : undefined}
          title={viewState === 'passed' ? '验证通过' : '你不是人类！'}
        />
    );
  }

  if (!round) {
    return null;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]" data-testid="challenge-layout">
      <div className="flex-1">
        <ChallengeCard
          isSubmitting={viewState === 'submitting'}
          onSelectionChange={setSelectedOptionId}
          onSubmit={submitSelection}
          options={round.options}
          prompt={round.prompt}
          selectedOptionId={selectedOptionId}
          submitLabel={viewState === 'submitting' ? '验证中...' : '验证'}
        />
        {errorMessage ? <p className="mt-4 text-sm text-rose-700">{errorMessage}</p> : null}
      </div>
      <div className="w-full max-w-sm">
        <ChallengeStatusPanel
          currentRoundIndex={metrics.currentRoundIndex}
          mistakeCount={metrics.mistakeCount}
          remainingMistakesBeforeFailure={metrics.remainingMistakesBeforeFailure}
          requiredPassCount={activeConfig.requiredPassCount}
          totalRounds={activeConfig.totalRounds}
        />
      </div>
      </div>
    </main>
  );
}
