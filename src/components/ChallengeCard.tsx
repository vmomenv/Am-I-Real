import { useEffect, useState } from 'react';

import type { ChallengeOption } from '@/src/lib/challenge-types';

interface ChallengeCardProps {
  prompt: string;
  options: ChallengeOption[];
  selectedOptionId?: string | null;
  submitLabel: string;
  isSubmitting: boolean;
  onSelectionChange: (optionId: string) => void;
  onSubmit: (optionId: string) => void;
}

export function ChallengeCard({
  prompt,
  options,
  selectedOptionId = null,
  submitLabel,
  isSubmitting,
  onSelectionChange,
  onSubmit,
}: ChallengeCardProps) {
  const [currentSelection, setCurrentSelection] = useState<string | null>(selectedOptionId);
  const [failedImageIds, setFailedImageIds] = useState<string[]>([]);
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
  }

  return (
    <section className="w-full rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur">
      <h2 className="text-xl font-semibold text-white">{prompt}</h2>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {options.map((option) => {
          const isSelected = currentSelection === option.id;
          const hasFailed = failedImageIds.includes(option.id);

          return (
            <button
              aria-label={option.alt}
              aria-pressed={isSelected}
              className={`overflow-hidden rounded-2xl border transition ${
                isSelected
                  ? 'border-cyan-300 shadow-lg shadow-cyan-950/40'
                  : 'border-white/10 hover:border-white/30'
              }`}
              key={option.id}
              onClick={() => handleSelect(option.id)}
              type="button"
            >
              {hasFailed ? (
                <div className="flex aspect-square items-center justify-center bg-slate-800 px-4 text-center text-sm text-slate-300">
                  图片加载失败
                </div>
              ) : (
                <img
                  alt={option.alt}
                  className="aspect-square w-full object-cover"
                  onError={() => handleImageError(option.id)}
                  src={option.imageUrl}
                />
              )}
            </button>
          );
        })}
      </div>
      {hasImageErrors ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <span>图片加载失败，请重新载入后再提交。</span>
          <button
            className="rounded-full border border-amber-300/40 px-3 py-1 text-xs font-medium text-amber-50"
            onClick={handleReload}
            type="button"
          >
            重新载入
          </button>
        </div>
      ) : null}
      <button
        className="mt-6 inline-flex rounded-full bg-cyan-400 px-6 py-3 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
        disabled={!currentSelection || hasImageErrors || isSubmitting}
        onClick={() => currentSelection && onSubmit(currentSelection)}
        type="button"
      >
        {submitLabel}
      </button>
    </section>
  );
}
