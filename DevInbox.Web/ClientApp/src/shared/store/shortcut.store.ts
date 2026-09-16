import { create } from 'zustand';
import type { ShortcutActionId } from '@shared/shortcuts/shortcuts.registry';

interface DispatchedAction {
  id: ShortcutActionId;
  /** Monotonically increasing so re-dispatching the same id twice in a row still triggers
   * the executor's effect (object identity alone wouldn't change otherwise). */
  token: number;
}

interface ShortcutState {
  lastAction: DispatchedAction | null;
  /** Queues a shortcut action by id — called by keyboard handlers and the command palette alike.
   * `useShortcutExecutor` is the sole consumer that turns this into an actual side effect. */
  dispatch: (id: ShortcutActionId) => void;
  isPaletteOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
}

let nextToken = 0;

/** Combined shortcut state: the dispatch queue every trigger (keyboard or command palette)
 * feeds into (`useShortcutExecutor` is the only consumer that reads `lastAction` and runs it),
 * plus the command palette's own open/closed UI state — kept in one store since both are just
 * different facets of "the shortcut system's current state". */
export const useShortcutStore = create<ShortcutState>((set) => ({
  lastAction: null,
  dispatch: (id) => set({ lastAction: { id, token: ++nextToken } }),
  isPaletteOpen: false,
  openPalette: () => set({ isPaletteOpen: true }),
  closePalette: () => set({ isPaletteOpen: false }),
  togglePalette: () => set((state) => ({ isPaletteOpen: !state.isPaletteOpen })),
}));
