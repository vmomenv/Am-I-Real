export function getFailureMistakeThreshold(totalRounds: number, requiredPassCount: number) {
  return totalRounds - requiredPassCount + 1;
}

export function getRemainingMistakesBeforeFailure(
  totalRounds: number,
  requiredPassCount: number,
  mistakeCount: number,
) {
  return Math.max(0, getFailureMistakeThreshold(totalRounds, requiredPassCount) - mistakeCount);
}

export function getChallengeOutcome(
  totalRounds: number,
  requiredPassCount: number,
  correctCount: number,
  mistakeCount: number,
) {
  if (correctCount >= requiredPassCount) {
    return 'passed';
  }

  if (mistakeCount >= getFailureMistakeThreshold(totalRounds, requiredPassCount)) {
    return 'failed';
  }

  return 'continue';
}
