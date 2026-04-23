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
      <button
        className="mt-6 inline-flex rounded-full bg-cyan-400 px-6 py-3 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
        disabled={!currentSelection || isSubmitting}
        onClick={() => currentSelection && onSubmit(currentSelection)}
        type="button"
      >
        {submitLabel}
      </button>
    </section>
  );
}
