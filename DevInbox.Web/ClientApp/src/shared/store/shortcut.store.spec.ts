import { beforeEach, describe, expect, it } from 'vitest';
import { useShortcutStore } from './shortcut.store';

describe('useShortcutStore', () => {
  beforeEach(() => {
    useShortcutStore.setState({ lastAction: null, isPaletteOpen: false });
  });

  describe('dispatch queue', () => {
    it('should start with no dispatched action', () => {
      expect(useShortcutStore.getState().lastAction).toBeNull();
    });

    it('should record the dispatched action id', () => {
      useShortcutStore.getState().dispatch('trigger-sync');
      expect(useShortcutStore.getState().lastAction?.id).toBe('trigger-sync');
    });

    it('should bump the token on every dispatch, even for the same id twice in a row', () => {
      useShortcutStore.getState().dispatch('nav-next-item');
      const first = useShortcutStore.getState().lastAction?.token;
      useShortcutStore.getState().dispatch('nav-next-item');
      const second = useShortcutStore.getState().lastAction?.token;
      expect(second).not.toBe(first);
    });
  });

  describe('command palette', () => {
    it('should start closed', () => {
      expect(useShortcutStore.getState().isPaletteOpen).toBe(false);
    });

    it('should open', () => {
      useShortcutStore.getState().openPalette();
      expect(useShortcutStore.getState().isPaletteOpen).toBe(true);
    });

    it('should close', () => {
      useShortcutStore.setState({ isPaletteOpen: true });
      useShortcutStore.getState().closePalette();
      expect(useShortcutStore.getState().isPaletteOpen).toBe(false);
    });

    it('should toggle', () => {
      useShortcutStore.getState().togglePalette();
      expect(useShortcutStore.getState().isPaletteOpen).toBe(true);
      useShortcutStore.getState().togglePalette();
      expect(useShortcutStore.getState().isPaletteOpen).toBe(false);
    });
  });
});
