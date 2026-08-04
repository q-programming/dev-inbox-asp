import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@test/renderWithProviders';
import ThemeCard from './ThemeCard';
import { Theme } from '@api';

describe('ThemeCard', () => {
  it('calls onSelect when clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderWithProviders(<ThemeCard mode={Theme.Light} selected={false} onSelect={onSelect} />);
    await user.click(screen.getByTestId('theme-card-light'));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('is marked as pressed when selected', () => {
    renderWithProviders(<ThemeCard mode={Theme.Dark} selected={true} onSelect={vi.fn()} />);
    expect(screen.getByTestId('theme-card-dark')).toHaveAttribute('aria-pressed', 'true');
  });

  it('is not marked as pressed when not selected', () => {
    renderWithProviders(<ThemeCard mode={Theme.Dark} selected={false} onSelect={vi.fn()} />);
    expect(screen.getByTestId('theme-card-dark')).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows the check icon only when selected', () => {
    const { container, rerender } = renderWithProviders(
      <ThemeCard mode={Theme.Light} selected={false} onSelect={vi.fn()} />,
    );
    expect(container.querySelector('[data-testid="CheckCircleIcon"]')).toBeNull();

    rerender(<ThemeCard mode={Theme.Light} selected={true} onSelect={vi.fn()} />);
    expect(container.querySelector('[data-testid="CheckCircleIcon"]')).toBeTruthy();
  });
});
