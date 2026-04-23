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

  it('blocks submission after an image error until the user reloads the round', () => {
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

    const brokenImage = screen.getByRole('img', { name: 'Candidate 2' });
    fireEvent.error(brokenImage);
    fireEvent.click(screen.getByRole('button', { name: 'Candidate 3' }));

    expect(screen.getByText('图片加载失败')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '提交' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '重新载入' }));

    expect(screen.queryByText('图片加载失败')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '提交' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: '提交' }));

    expect(onSubmit).toHaveBeenCalledWith('option-3');
  });
});
