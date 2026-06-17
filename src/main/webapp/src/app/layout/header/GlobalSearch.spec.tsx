import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@test/renderWithProviders.tsx';
import { FOCUS_SEARCH_EVENT } from '@shared/hooks/useGlobalShortcuts.ts';
import GlobalSearch from './GlobalSearch.tsx';

function renderSearch() {
  return renderWithProviders(<GlobalSearch />);
}

function getInput() {
  return screen.getByTestId('global-search-input') as HTMLInputElement;
}

describe('GlobalSearch', () => {
  describe('FOCUS_SEARCH_EVENT', () => {
    it('should call focus() on the input when FOCUS_SEARCH_EVENT is dispatched', () => {
      renderSearch();
      const input = getInput();
      const focusSpy = vi.spyOn(input, 'focus');
      act(() => {
        document.dispatchEvent(new CustomEvent(FOCUS_SEARCH_EVENT));
      });
      expect(focusSpy).toHaveBeenCalled();
    });
  });

  describe('Escape key', () => {
    it('should call blur() on the input when Escape is pressed', () => {
      renderSearch();
      const input = getInput();
      const blurSpy = vi.spyOn(input, 'blur');
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(blurSpy).toHaveBeenCalled();
    });

    it('should not throw when Escape is pressed while input is not focused', () => {
      renderSearch();
      expect(() => fireEvent.keyDown(document, { key: 'Escape' })).not.toThrow();
    });
  });

  describe('typing', () => {
    it('should update value when user types', () => {
      renderSearch();
      const input = getInput();
      fireEvent.change(input, { target: { value: 'react query' } });
      expect(input.value).toBe('react query');
    });
  });

  describe('cleanup', () => {
    it('should remove FOCUS_SEARCH_EVENT listener on unmount', () => {
      const { unmount } = renderSearch();
      const input = getInput();
      const focusSpy = vi.spyOn(input, 'focus');
      unmount();
      act(() => {
        document.dispatchEvent(new CustomEvent(FOCUS_SEARCH_EVENT));
      });
      expect(focusSpy).not.toHaveBeenCalled();
    });

    it('should remove Escape keydown listener on unmount', () => {
      const { unmount } = renderSearch();
      const input = getInput();
      const blurSpy = vi.spyOn(input, 'blur');
      unmount();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(blurSpy).not.toHaveBeenCalled();
    });
  });
});
