import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useShortcutKeys } from './useShortcutKeys.ts';
import { useShortcutStore } from '@shared/store/shortcut.store';

function renderShortcuts() {
  return renderHook(() => useShortcutKeys());
}

function fireKey(key: string, modifiers: Partial<KeyboardEventInit> = {}) {
  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...modifiers }));
  });
}

function lastDispatchedId() {
  return useShortcutStore.getState().lastAction?.id;
}

beforeEach(() => {
  useShortcutStore.setState({ lastAction: null, isPaletteOpen: false });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useShortcutKeys', () => {
  describe('global shortcuts', () => {
    it('should dispatch "focus-search" on Ctrl+F', () => {
      renderShortcuts();
      fireKey('f', { ctrlKey: true });
      expect(lastDispatchedId()).toBe('focus-search');
    });

    it('should dispatch "focus-search" on Meta+F (Mac Cmd)', () => {
      renderShortcuts();
      fireKey('f', { metaKey: true });
      expect(lastDispatchedId()).toBe('focus-search');
    });

    it('should dispatch "focus-search" on plain "/"', () => {
      renderShortcuts();
      fireKey('/');
      expect(lastDispatchedId()).toBe('focus-search');
    });

    it('should NOT dispatch anything when typing in an input', () => {
      renderShortcuts();
      const input = document.createElement('input');
      document.body.appendChild(input);
      act(() => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }));
      });
      expect(lastDispatchedId()).toBeUndefined();
      document.body.removeChild(input);
    });

    it('should NOT dispatch anything when typing in a textarea', () => {
      renderShortcuts();
      const ta = document.createElement('textarea');
      document.body.appendChild(ta);
      act(() => {
        ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }));
      });
      expect(lastDispatchedId()).toBeUndefined();
      document.body.removeChild(ta);
    });

    it('should toggle the command palette on Ctrl/Cmd + K without dispatching a queued action', () => {
      renderShortcuts();
      fireKey('k', { ctrlKey: true });
      expect(useShortcutStore.getState().isPaletteOpen).toBe(true);
      expect(lastDispatchedId()).toBeUndefined();
    });

    describe('double Shift — open command palette', () => {
      it('should toggle the palette when Shift is tapped twice in quick succession', () => {
        renderShortcuts();
        fireKey('Shift');
        fireKey('Shift');
        expect(useShortcutStore.getState().isPaletteOpen).toBe(true);
      });

      it('should NOT toggle the palette on a single Shift tap', () => {
        renderShortcuts();
        fireKey('Shift');
        expect(useShortcutStore.getState().isPaletteOpen).toBe(false);
      });

      it('should NOT toggle the palette when another key is pressed between the two Shift taps', () => {
        renderShortcuts();
        fireKey('Shift');
        fireKey('a');
        fireKey('Shift');
        expect(useShortcutStore.getState().isPaletteOpen).toBe(false);
      });

      it('should ignore held-down Shift repeat events', () => {
        renderShortcuts();
        fireKey('Shift');
        fireKey('Shift', { repeat: true });
        expect(useShortcutStore.getState().isPaletteOpen).toBe(false);
      });
    });

    it('should dispatch "open-settings" on Ctrl/Cmd + ,', () => {
      renderShortcuts();
      fireKey(',', { ctrlKey: true });
      expect(lastDispatchedId()).toBe('open-settings');
    });

    it('should dispatch "trigger-sync" on Ctrl/Cmd + R', () => {
      renderShortcuts();
      fireKey('r', { ctrlKey: true });
      expect(lastDispatchedId()).toBe('trigger-sync');
    });

    it('should dispatch "toggle-sidebar" on Ctrl/Cmd + \\', () => {
      renderShortcuts();
      fireKey('\\', { ctrlKey: true });
      expect(lastDispatchedId()).toBe('toggle-sidebar');
    });

    it('should dispatch "escape" on Esc', () => {
      renderShortcuts();
      fireKey('Escape');
      expect(lastDispatchedId()).toBe('escape');
    });

    it('should dispatch "new-note" on plain "n"', () => {
      renderShortcuts();
      fireKey('n');
      expect(lastDispatchedId()).toBe('new-note');
    });

    it('should NOT dispatch "new-note" when Ctrl is held with "n"', () => {
      renderShortcuts();
      fireKey('n', { ctrlKey: true });
      expect(lastDispatchedId()).toBeUndefined();
    });

    it('should dispatch "attach-note" on Shift+N', () => {
      renderShortcuts();
      fireKey('n', { shiftKey: true });
      expect(lastDispatchedId()).toBe('attach-note');
    });

    it('should NOT dispatch "attach-note" when Ctrl is also held with Shift+N', () => {
      renderShortcuts();
      fireKey('n', { shiftKey: true, ctrlKey: true });
      expect(lastDispatchedId()).toBeUndefined();
    });

    it('should dispatch "nav-prev-item" on plain "j"', () => {
      renderShortcuts();
      fireKey('j');
      expect(lastDispatchedId()).toBe('nav-prev-item');
    });

    it('should dispatch "nav-next-item" on plain "k"', () => {
      renderShortcuts();
      fireKey('k');
      expect(lastDispatchedId()).toBe('nav-next-item');
    });

    it('should dispatch "toggle-save" on plain "s"', () => {
      renderShortcuts();
      fireKey('s');
      expect(lastDispatchedId()).toBe('toggle-save');
    });

    it('should dispatch "toggle-done" on plain "d"', () => {
      renderShortcuts();
      fireKey('d');
      expect(lastDispatchedId()).toBe('toggle-done');
    });
  });

  describe('leader key ("g" then <letter>)', () => {
    it('should dispatch "goto-inbox" on g then i', () => {
      renderShortcuts();
      fireKey('g');
      fireKey('i');
      expect(lastDispatchedId()).toBe('goto-inbox');
    });

    it('should dispatch "goto-review-requests" on g then r', () => {
      renderShortcuts();
      fireKey('g');
      fireKey('r');
      expect(lastDispatchedId()).toBe('goto-review-requests');
    });

    it('should dispatch "goto-mentions" on g then m', () => {
      renderShortcuts();
      fireKey('g');
      fireKey('m');
      expect(lastDispatchedId()).toBe('goto-mentions');
    });

    it('should dispatch "goto-my-prs" on g then p', () => {
      renderShortcuts();
      fireKey('g');
      fireKey('p');
      expect(lastDispatchedId()).toBe('goto-my-prs');
    });

    it('should dispatch "goto-ado-items" on g then a', () => {
      renderShortcuts();
      fireKey('g');
      fireKey('a');
      expect(lastDispatchedId()).toBe('goto-ado-items');
    });

    it('should dispatch "goto-notes" on g then n (not "new-note")', () => {
      renderShortcuts();
      fireKey('g');
      fireKey('n');
      expect(lastDispatchedId()).toBe('goto-notes');
    });

    it('should dispatch "goto-saved" on g then s (not "toggle-save")', () => {
      renderShortcuts();
      fireKey('g');
      fireKey('s');
      expect(lastDispatchedId()).toBe('goto-saved');
    });

    it('should dispatch "goto-done" on g then d (not "toggle-done")', () => {
      renderShortcuts();
      fireKey('g');
      fireKey('d');
      expect(lastDispatchedId()).toBe('goto-done');
    });

    it('should not dispatch when second key is unmapped', () => {
      renderShortcuts();
      fireKey('g');
      fireKey('z');
      expect(lastDispatchedId()).toBeUndefined();
    });

    it('should not dispatch when second key arrives after the 1s timeout, and "n" resolves as plain "new-note" again', () => {
      renderShortcuts();
      fireKey('g');
      act(() => vi.advanceTimersByTime(1100));
      fireKey('n');
      expect(lastDispatchedId()).toBe('new-note');
    });

    it('should not activate leader when g is pressed inside an input', () => {
      renderShortcuts();
      const input = document.createElement('input');
      document.body.appendChild(input);
      act(() => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true }));
      });
      fireKey('i');
      expect(lastDispatchedId()).toBeUndefined();
      document.body.removeChild(input);
    });

    it('should not activate leader when g is pressed with a modifier', () => {
      renderShortcuts();
      fireKey('g', { ctrlKey: true });
      fireKey('i');
      expect(lastDispatchedId()).toBeUndefined();
    });
  });

  describe('cleanup', () => {
    it('should remove keydown listener on unmount', () => {
      const { unmount } = renderShortcuts();
      unmount();
      fireKey('f', { ctrlKey: true });
      expect(lastDispatchedId()).toBeUndefined();
    });
  });
});
