interface ChallengeStatusPanelProps {
  currentRoundIndex: number;
  totalRounds: number;
  mistakeCount: number;
  remainingMistakesBeforeFailure: number;
  requiredPassCount: number;
}

export function ChallengeStatusPanel({
  currentRoundIndex,
  totalRounds,
  mistakeCount,
  remainingMistakesBeforeFailure,
  requiredPassCount,
}: ChallengeStatusPanelProps) {
  return (
    <aside className="space-y-3">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Challenge Status</p>
        <p className="mt-3 text-lg font-bold text-slate-950">第 {currentRoundIndex} / {totalRounds} 轮</p>
        <p className="mt-2 text-2xl font-bold text-slate-950">已答错 {mistakeCount} 题</p>
        <p className="mt-1 text-sm text-slate-600">剩余 {remainingMistakesBeforeFailure} 次机会</p>
      </section>

    </aside>
  );
}
