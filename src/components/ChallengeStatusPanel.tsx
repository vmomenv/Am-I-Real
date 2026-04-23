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
    <aside className="rounded-3xl border border-white/10 bg-slate-950/50 p-6 text-sm text-slate-200">
      <p className="text-lg font-semibold text-white">第 {currentRoundIndex} / {totalRounds} 轮</p>
      <p className="mt-4">已答错 {mistakeCount} 题</p>
      <p className="mt-2">剩余 {remainingMistakesBeforeFailure} 次机会</p>
      <p className="mt-6 text-slate-300">规则：共 {totalRounds} 轮，答对 {requiredPassCount} 轮即可通过。</p>
    </aside>
  );
}
