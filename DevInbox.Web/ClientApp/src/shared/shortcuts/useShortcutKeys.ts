import { useEffect, useRef } from 'react';
import { useShortcutStore } from '@shared/store/shortcut.store';
import { comboKeyFor, GLOBAL_KEY_ACTIONS, LEADER_KEY_ACTIONS } from '@shared/shortcuts/shortcuts.registry';

/** Max gap (ms) between two lone Shift taps to count as the "double Shift" palette shortcut. */
const DOUBLE_SHIFT_THRESHOLD_MS = 400;
const LEADER = 'g';
/** How long a "g" press stays "waiting for its second key" before it's treated as a stray g. */
const LEADER_TIMEOUT_MS = 1000;

/**
 * The single `document` keydown listener behind every keyboard shortcut. It only detects *which*
 * combo/sequence was pressed and dispatches the matching action id (looked up in
 * `GLOBAL_KEY_ACTIONS` / `LEADER_KEY_ACTIONS` — see `shortcuts.registry.ts` for the full list of
 * shortcuts, the "g then <letter>" leader sequences, and the few combos handled directly below
 * instead of through those maps). The actual behaviour (navigation, mutations, alerts, ...) lives
 * in the registry's `run` functions and is executed by `useShortcutExecutor`.
 *
 * Combined into one listener (rather than a separate hook per concern) so the "g" leader sequence
 * and the plain-letter shortcuts that double as its second key (n/s/d) can share one piece of
 * "is a leader sequence pending?" state instead of coordinating across hooks.
 */
export function useShortcutKeys() {
  const dispatch = useShortcutStore((state) => state.dispatch);
  const toggleCommandPalette = useShortcutStore((state) => state.togglePalette);
  const lastShiftTapAt = useRef(0);
  const leaderPending = useRef(false);
  const leaderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearLeaderPending = () => {
      leaderPending.current = false;
      if (leaderTimer.current) {
        clearTimeout(leaderTimer.current);
        leaderTimer.current = null;
      }
    };

    const handler = (event: KeyboardEvent) => {
      // Suppress shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        return;
      }
      if (event.altKey) {
        return;
      }
      const isMod = event.metaKey || event.ctrlKey;

      // A lone Shift tap, twice in a row within the threshold — held-down repeats and Shift used
      // as part of another combo (Shift+<key>) don't reach here as a bare "Shift" keydown.
      if (event.key === 'Shift') {
        if (event.repeat) {
          return;
        }
        const now = Date.now();
        if (now - lastShiftTapAt.current <= DOUBLE_SHIFT_THRESHOLD_MS) {
          lastShiftTapAt.current = 0;
          toggleCommandPalette();
        } else {
          lastShiftTapAt.current = now;
        }
        return;
      }
      // Any other key breaks the double-Shift sequence.
      lastShiftTapAt.current = 0;

      // Ctrl/Cmd + K opens the palette directly — not a listed/dispatchable action.
      if (isMod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        toggleCommandPalette();
        return;
      }

      const isPlainLetter = !isMod && !event.shiftKey;

      // "g" — the leader key. Starts (or restarts) a 1s window during which the next plain key
      // is looked up in LEADER_KEY_ACTIONS instead of GLOBAL_KEY_ACTIONS.
      if (isPlainLetter && event.key === LEADER && !leaderPending.current) {
        event.preventDefault();
        leaderPending.current = true;
        leaderTimer.current = setTimeout(clearLeaderPending, LEADER_TIMEOUT_MS);
        return;
      }

      if (isPlainLetter && leaderPending.current) {
        event.preventDefault();
        clearLeaderPending();
        const actionId = LEADER_KEY_ACTIONS[event.key];
        if (actionId) {
          dispatch(actionId);
        }
        return;
      }

      const binding = GLOBAL_KEY_ACTIONS[comboKeyFor(event)];
      if (!binding) {
        return;
      }
      if (binding.preventDefault) {
        event.preventDefault();
      }
      dispatch(binding.id);
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      clearLeaderPending();
    };
  }, [dispatch, toggleCommandPalette]);
}
