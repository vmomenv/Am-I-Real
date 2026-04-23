import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { ChallengeCard } from '../ChallengeCard';

describe('ChallengeCard', () => {
  it('keeps submit disabled until a choice is selected', () => {
    const onSelectionChange = vi.fn();
    const onSubmit = vi.fn();

    render(
      <ChallengeCard
        prompt="请选择唯一真实照片"
        options={Array.from({ length: 9 }, (_, index) => ({
          id: `option-${index + 1}`,
          imageUrl: `https://example.com/${index + 1}.jpg`,
          alt: `Candidate ${index + 1}`,
        }))}
        selectedOptionId={null}
        submitLabel="提交"
        isSubmitting={false}
        onSelectionChange={onSelectionChange}
        onSubmit={onSubmit}
      />,
    );

    const submitButton = screen.getByRole('button', { name: '提交' });
    expect(submitButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Candidate 3' }));

    expect(onSelectionChange).toHaveBeenCalledWith('option-3');
    expect(submitButton).toBeEnabled();
  });
});
