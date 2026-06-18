import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FOCUS_SEARCH_EVENT, useGlobalShortcuts } from './useGlobalShortcuts.ts';

function renderShortcuts() {
  return renderHook(() => useGlobalShortcuts(), {
    wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
  });
}

function fireKey(key: string, modifiers: Partial<KeyboardEventInit> = {}) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...modifiers }));
}

describe('useGlobalShortcuts', () => {
  describe('Ctrl/Cmd + F — focus search', () => {
    it('should dispatch FOCUS_SEARCH_EVENT on Ctrl+F', () => {
      renderShortcuts();
      const listener = vi.fn();
      document.addEventListener(FOCUS_SEARCH_EVENT, listener);

      fireKey('f', { ctrlKey: true });

      expect(listener).toHaveBeenCalledOnce();
      document.removeEventListener(FOCUS_SEARCH_EVENT, listener);
    });

    it('should dispatch FOCUS_SEARCH_EVENT on Meta+F (Mac Cmd)', () => {
      renderShortcuts();
      const listener = vi.fn();
      document.addEventListener(FOCUS_SEARCH_EVENT, listener);

      fireKey('f', { metaKey: true });

      expect(listener).toHaveBeenCalledOnce();
      document.removeEventListener(FOCUS_SEARCH_EVENT, listener);
    });

    it('should NOT dispatch FOCUS_SEARCH_EVENT when typing in an input', () => {
      renderShortcuts();
      const listener = vi.fn();
      document.addEventListener(FOCUS_SEARCH_EVENT, listener);

      const input = document.createElement('input');
      document.body.appendChild(input);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }));

      expect(listener).not.toHaveBeenCalled();
      document.body.removeChild(input);
      document.removeEventListener(FOCUS_SEARCH_EVENT, listener);
    });

    it('should NOT dispatch FOCUS_SEARCH_EVENT when typing in a textarea', () => {
      renderShortcuts();
      const listener = vi.fn();
      document.addEventListener(FOCUS_SEARCH_EVENT, listener);

      const ta = document.createElement('textarea');
      document.body.appendChild(ta);
      ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }));

      expect(listener).not.toHaveBeenCalled();
      document.body.removeChild(ta);
      document.removeEventListener(FOCUS_SEARCH_EVENT, listener);
    });
  });

  describe('cleanup', () => {
    it('should remove keydown listener on unmount', () => {
      const listener = vi.fn();
      const { unmount } = renderShortcuts();
      document.addEventListener(FOCUS_SEARCH_EVENT, listener);

      unmount();
      fireKey('f', { ctrlKey: true });

      expect(listener).not.toHaveBeenCalled();
      document.removeEventListener(FOCUS_SEARCH_EVENT, listener);
    });
  });
});
