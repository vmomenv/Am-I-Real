'use client';

import { ChallengeCard } from '@/src/components/ChallengeCard';
import { ChallengeStatusPanel } from '@/src/components/ChallengeStatusPanel';
import { VerificationShell } from '@/src/components/VerificationShell';
import { useChallengeFlow } from '@/src/hooks/useChallengeFlow';

const FALLBACK_CONFIG = {
  brandName: 'Groundflare',
  displaySiteName: 'Groundflare Verification',
  totalRounds: 10,
  requiredPassCount: 7,
};

export function VerificationExperience() {
  const {
    config,
    round,
    selectedOptionId,
    errorMessage,
    viewState,
    metrics,
    setSelectedOptionId,
    beginChallenge,
    submitSelection,
  } = useChallengeFlow();

  const activeConfig = config ?? FALLBACK_CONFIG;

  if (viewState === 'loading' || viewState === 'readyToVerify' || viewState === 'error') {
    return (
      <VerificationShell
        brandName={activeConfig.brandName}
        buttonDisabled={viewState === 'loading'}
        buttonLabel={viewState === 'loading' ? '正在加载...' : '开始验证'}
        errorMessage={errorMessage}
        onAction={beginChallenge}
        progressMax={activeConfig.totalRounds}
        progressValue={0}
        siteName={activeConfig.displaySiteName}
      />
    );
  }

  if (viewState === 'passed' || viewState === 'failed') {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-20">
        <section className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-950/30 backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">
            {activeConfig.brandName}
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-white">
            {viewState === 'passed' ? '验证已完成' : '验证未通过'}
          </h1>
          {errorMessage ? (
            <p className="mt-4 text-base leading-7 text-slate-300">{errorMessage}</p>
          ) : null}
        </section>
      </main>
    );
  }

  if (!round) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10 lg:flex-row">
      <div className="flex-1">
        <ChallengeCard
          isSubmitting={viewState === 'submitting'}
          onSelectionChange={setSelectedOptionId}
          onSubmit={submitSelection}
          options={round.options}
          prompt={round.prompt}
          selectedOptionId={selectedOptionId}
          submitLabel={viewState === 'submitting' ? '提交中...' : '提交'}
        />
        {errorMessage ? <p className="mt-4 text-sm text-rose-200">{errorMessage}</p> : null}
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
    </main>
  );
}
