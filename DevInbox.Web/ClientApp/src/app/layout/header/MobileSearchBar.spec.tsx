import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@test/renderWithProviders.tsx';
import MobileSearchBar from './MobileSearchBar.tsx';

function renderBar(onExpandChange = vi.fn()) {
  return renderWithProviders(<MobileSearchBar onExpandChange={onExpandChange} />);
}

describe('MobileSearchBar', () => {
  describe('collapsed state', () => {
    it('should render the open-search icon button by default', () => {
      renderBar();
      expect(screen.getByRole('button', { name: /open search/i })).toBeTruthy();
    });

    it('should not show the search input when collapsed', () => {
      renderBar();
      expect(screen.queryByTestId('mobile-search-input')).toBeNull();
    });
  });

  describe('expanding', () => {
    it('should show the search input after clicking the search button', async () => {
      const user = userEvent.setup();
      renderBar();
      await user.click(screen.getByRole('button', { name: /open search/i }));
      expect(screen.getByTestId('mobile-search-input')).toBeTruthy();
    });

    it('should hide the open-search button after expanding', async () => {
      const user = userEvent.setup();
      renderBar();
      await user.click(screen.getByRole('button', { name: /open search/i }));
      expect(screen.queryByRole('button', { name: /open search/i })).toBeNull();
    });

    it('should show the close button after expanding', async () => {
      const user = userEvent.setup();
      renderBar();
      await user.click(screen.getByRole('button', { name: /open search/i }));
      expect(screen.getByRole('button', { name: /close search/i })).toBeTruthy();
    });

    it('should call onExpandChange(true) when expanding', async () => {
      const user = userEvent.setup();
      const onExpandChange = vi.fn();
      renderBar(onExpandChange);
      await user.click(screen.getByRole('button', { name: /open search/i }));
      expect(onExpandChange).toHaveBeenCalledWith(true);
    });
  });

  describe('collapsing', () => {
    it('should restore the search icon button after closing', async () => {
      const user = userEvent.setup();
      renderBar();
      await user.click(screen.getByRole('button', { name: /open search/i }));
      await user.click(screen.getByRole('button', { name: /close search/i }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /open search/i })).toBeTruthy(),
      );
    });

    it('should call onExpandChange(false) when closing', async () => {
      const user = userEvent.setup();
      const onExpandChange = vi.fn();
      renderBar(onExpandChange);
      await user.click(screen.getByRole('button', { name: /open search/i }));
      await user.click(screen.getByRole('button', { name: /close search/i }));
      expect(onExpandChange).toHaveBeenCalledWith(false);
    });
  });
});
