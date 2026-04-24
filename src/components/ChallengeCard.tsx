import { useEffect, useState } from 'react';

import type { ChallengeOption } from '@/src/lib/challenge-types';

interface ChallengeCardProps {
  currentRoundIndex?: number;
  mistakeCount?: number;
  prompt: string;
  options: ChallengeOption[];
  remainingMistakesBeforeFailure?: number;
  selectedOptionId?: string | null;
  submitLabel: string;
  totalRounds?: number;
  isSubmitting: boolean;
  onSelectionChange: (optionId: string) => void;
  onSubmit: (optionId: string) => void;
}

export function ChallengeCard({
  currentRoundIndex,
  mistakeCount,
  prompt,
  options,
  remainingMistakesBeforeFailure,
  selectedOptionId = null,
  submitLabel,
  totalRounds,
  isSubmitting,
  onSelectionChange,
  onSubmit,
}: ChallengeCardProps) {
  const [currentSelection, setCurrentSelection] = useState<string | null>(selectedOptionId);
  const [failedImageIds, setFailedImageIds] = useState<string[]>([]);
  const [reloadVersion, setReloadVersion] = useState(0);
  const hasImageErrors = failedImageIds.length > 0;

  useEffect(() => {
    setCurrentSelection(selectedOptionId);
  }, [selectedOptionId]);

  function handleSelect(optionId: string) {
    setCurrentSelection(optionId);
    onSelectionChange(optionId);
  }

  function handleImageError(optionId: string) {
    setFailedImageIds((current) =>
      current.includes(optionId) ? current : [...current, optionId],
    );
  }

  function handleReload() {
    setFailedImageIds([]);
    setReloadVersion((current) => current + 1);
  }

  function buildImageUrl(imageUrl: string) {
    const separator = imageUrl.includes('?') ? '&' : '?';
    return `${imageUrl}${separator}reload=${reloadVersion}`;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="bg-blue-600 px-4 py-3 text-white">
        <h2 className="text-sm font-semibold">{prompt}</h2>
        <p className="mt-1 text-xs text-blue-100">请从下方 9 张图像中选出真实拍摄的图片</p>
      </header>

      <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 sm:gap-3">
        {options.map((option) => {
          const isSelected = currentSelection === option.id;
          const hasFailed = failedImageIds.includes(option.id);

          return (
            <button
              aria-label={option.alt}
              aria-pressed={isSelected}
              className={`overflow-hidden rounded-2xl border transition ${
                isSelected
                  ? 'border-blue-600 ring-2 ring-blue-200'
                  : 'border-slate-200 hover:border-slate-400'
              }`}
              key={option.id}
              onClick={() => handleSelect(option.id)}
              type="button"
            >
              {hasFailed ? (
                <div className="flex aspect-square items-center justify-center bg-slate-200 px-4 text-center text-sm text-slate-500">
                  图片加载失败
                </div>
              ) : (
                <img
                  alt={option.alt}
                  className="aspect-square w-full object-cover"
                  key={`${option.id}-${reloadVersion}`}
                  onError={() => handleImageError(option.id)}
                  src={buildImageUrl(option.imageUrl)}
                />
              )}
            </button>
          );
        })}
      </div>

      <footer className="space-y-3 border-t border-slate-200 bg-white px-4 py-3">
        {hasImageErrors ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <span>图像加载失败，请重新载入后再提交。</span>
            <button
              className="rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-700"
              onClick={handleReload}
              type="button"
            >
              重新载入
            </button>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          {typeof currentRoundIndex === 'number' &&
          typeof totalRounds === 'number' &&
          typeof mistakeCount === 'number' &&
          typeof remainingMistakesBeforeFailure === 'number' ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <p className="font-medium text-slate-800">第 {currentRoundIndex}/{totalRounds} 轮</p>
              <p className="mt-1">错 {mistakeCount} 次 | 余 {remainingMistakesBeforeFailure} 次</p>
            </div>
          ) : (
            <div />
          )}
          <button
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={!currentSelection || hasImageErrors || isSubmitting}
            onClick={() => currentSelection && onSubmit(currentSelection)}
            type="button"
          >
            {submitLabel}
          </button>
        </div>
      </footer>
    </section>
  );
}
