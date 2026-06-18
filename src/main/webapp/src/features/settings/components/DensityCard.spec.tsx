import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@test/renderWithProviders';
import DensityCard from './DensityCard';
import { Density } from '@shared/theme/theme';

describe('DensityCard', () => {
  it('calls onSelect when clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderWithProviders(
      <DensityCard density={Density.TIGHT} selected={false} onSelect={onSelect} />,
    );
    await user.click(screen.getByTestId('density-card-tight'));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('is marked as pressed when selected', () => {
    renderWithProviders(
      <DensityCard density={Density.RELAXED} selected={true} onSelect={vi.fn()} />,
    );
    expect(screen.getByTestId('density-card-relaxed')).toHaveAttribute('aria-pressed', 'true');
  });

  it('is not marked as pressed when not selected', () => {
    renderWithProviders(
      <DensityCard density={Density.RELAXED} selected={false} onSelect={vi.fn()} />,
    );
    expect(screen.getByTestId('density-card-relaxed')).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles checked/unchecked radio icon based on selected prop', () => {
    const { container, rerender } = renderWithProviders(
      <DensityCard density={Density.SUPER_TIGHT} selected={false} onSelect={vi.fn()} />,
    );
    expect(container.querySelector('[data-testid="RadioButtonUncheckedIcon"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="RadioButtonCheckedIcon"]')).toBeNull();

    rerender(<DensityCard density={Density.SUPER_TIGHT} selected={true} onSelect={vi.fn()} />);
    expect(container.querySelector('[data-testid="RadioButtonCheckedIcon"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="RadioButtonUncheckedIcon"]')).toBeNull();
  });
});
