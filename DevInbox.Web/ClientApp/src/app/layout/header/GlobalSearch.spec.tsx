import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@test/renderWithProviders.tsx';
import { FOCUS_SEARCH_EVENT } from '@shared/shortcuts/shortcuts.constants';
import { useInboxStore } from '@feature/inbox/store/inbox.store';
import GlobalSearch from './GlobalSearch.tsx';

function renderSearch() {
  return renderWithProviders(<GlobalSearch />);
}

function getInput() {
  return screen.getByTestId('global-search-input') as HTMLInputElement;
}

describe('GlobalSearch', () => {
  beforeEach(() => {
    useInboxStore.setState({ searchTerm: '' });
    vi.useRealTimers();
  });

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

    it('should send the trimmed value to Zustand after the debounce', () => {
      vi.useFakeTimers();
      renderSearch();
      const input = getInput();

      fireEvent.change(input, { target: { value: '  react query  ' } });

      expect(useInboxStore.getState().searchTerm).toBe('');

      act(() => {
        vi.runAllTimers();
      });

      expect(useInboxStore.getState().searchTerm).toBe('react query');
    });
  });

  describe('clear button', () => {
    it('should be hidden when the search input is empty', () => {
      renderSearch();

      expect(screen.queryByTestId('clear-search-button')).not.toBeInTheDocument();
    });

    it('should clear the input and Zustand search term when clicked', () => {
      useInboxStore.setState({ searchTerm: 'react query' });
      renderSearch();

      expect(screen.getByTestId('clear-search-button')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('clear-search-button'));

      expect(getInput().value).toBe('');
      expect(useInboxStore.getState().searchTerm).toBe('');
      expect(screen.queryByTestId('clear-search-button')).not.toBeInTheDocument();
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
