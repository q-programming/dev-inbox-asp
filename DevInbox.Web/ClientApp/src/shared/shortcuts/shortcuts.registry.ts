import { AppRoute } from '@app/routes.ts';
import { InboxReason, ItemSource, ItemStatus, ItemType, TriggerType } from '@api';
import { AlertType } from '@shared/store/alert.store';
import { modKey } from '@shared/utils/platform';
import { buildInboxSearch, type InboxFilter } from '@feature/inbox/utils/inboxFilter';
import { FOCUS_SEARCH_EVENT } from './shortcuts.constants';
import type { ShortcutAction } from './shortcuts.types';

/** Navigates to the inbox with an optional filter, same helper InboxList/InboxListHeader use. */
const goToInbox = (filter?: InboxFilter) => `${AppRoute.INBOX}${buildInboxSearch(filter)}`;

/** Raises the same "Navigating to X" info alert every `goto-*` action shows, keyed by the
 * leader-key letter shown in its `keys` label (e.g. "G then R" → `[ GR ]`). */
const navigateWithAlert = (ctx: Parameters<ShortcutAction['run']>[0], label: string, letter: string, path: string) => {
  ctx.addAlert({ type: AlertType.INFO, message: `Navigating to ${label} [ G \u2192 ${letter.toUpperCase()} ]` });
  ctx.navigate(path);
};

/**
 * --------- Global Shortcuts (always active) -----------------
 *
 * `useShortcutKeys` (the single `document` keydown listener behind every shortcut) only detects
 * *which* combo/sequence was pressed (via `comboKeyFor` + this map, or `LEADER_KEY_ACTIONS` for
 * "g then <letter>") and dispatches the matching action id — the actual behaviour (navigation,
 * mutations, alerts, ...) lives in the `run` functions above and is executed by
 * `useShortcutExecutor`. This keeps one single, searchable, listable source of truth that both
 * the keyboard and the Ctrl/Cmd + K command palette dispatch into.
 *
 * A few combos aren't simple 1:1 dispatches and are handled directly in `useShortcutKeys`
 * instead of through this map:
 * - Ctrl/Cmd + K and a double Shift-tap (IntelliJ-style) both open the command palette itself —
 *   "open the palette" isn't a listed/executable action, so there's nothing to dispatch.
 * - Plain "g" is the leader key — it starts a 1s window during which the next plain key is
 *   looked up in `LEADER_KEY_ACTIONS` below instead of `GLOBAL_KEY_ACTIONS` (e.g. "n" is both
 *   "new note" and, after "g", "go to notes" — which one fires depends only on whether a leader
 *   sequence is currently pending).
 *
 * Ctrl/Cmd + F or /	Focus search bar	→ 'focus-search'
 * Ctrl/Cmd + R	Trigger manual sync	→ 'trigger-sync'
 * Ctrl/Cmd + ,	Open settings	→ 'open-settings'
 * Ctrl/Cmd + \	Toggle sidebar	→ 'toggle-sidebar'
 * Esc	Close detail panel / dismiss modal	→ 'escape'
 * ?	Show keyboard shortcut cheatsheet	Not implemented yet — the command palette covers this need
 *
 * -------- List Navigation --------
 *
 * j	Select previous item	→ 'nav-prev-item'
 * k	Select next item	→ 'nav-next-item'
 *
 * Enter (open detail for a "highlighted but not yet opened" row), Ctrl/Cmd + Enter (open source
 * in browser) and Space (page scroll) still need per-row UI state InboxList owns and are NOT
 * handled here.
 *
 * -------- Item Actions (currently open detail panel) --------
 *
 * s	Save / Unsave	→ 'toggle-save'
 * d	Mark done / not done	→ 'toggle-done'
 * n	Create new note	→ 'new-note'
 *   Plain key, no modifier — Ctrl/Cmd + N is reserved by the browser (new window) and
 *   Ctrl/Cmd + Alt + N clashed with an OS/browser binding.
 * Shift + N	Attach note to open item	→ 'attach-note' (only when an inbox item is selected
 *   and doesn't already have a note attached — same guard as the detail panel's Add Note button)
 *
 * Note: the app currently has no read/unread, pin, snooze or priority concept on inbox items
 * (only isDone/isSaved), so shortcuts for those actions are not applicable and have been removed.
 */

/** Single source of truth for every implemented keyboard shortcut/leader-key sequence: display
 * metadata for the command palette (Ctrl/Cmd + K) plus the actual `run` logic executed by
 * `useShortcutExecutor`. */
export const SHORTCUT_ACTIONS = [
  {
    id: 'focus-search',
    keys: `${modKey}F  or  /`,
    label: 'Focus search',
    description: 'Jump to the search bar from anywhere',
    category: 'Global',
    run: () => document.dispatchEvent(new CustomEvent(FOCUS_SEARCH_EVENT)),
  },
  {
    id: 'open-settings',
    keys: `${modKey},`,
    label: 'Open settings',
    description: 'Navigate to the settings page',
    category: 'Global',
    run: (ctx) => {
      ctx.addAlert({ type: AlertType.INFO, message: `Navigating to Settings [ ${modKey}, ]` });
      ctx.navigate(AppRoute.SETTINGS);
    },
  },
  {
    id: 'trigger-sync',
    keys: `${modKey}R`,
    label: 'Trigger manual sync',
    description: 'Kick off a manual GitHub/ADO sync, same as the header [Sync] button',
    category: 'Global',
    run: (ctx) => {
      if (ctx.isSyncRunning) {
        return;
      }
      ctx.addAlert({ type: AlertType.INFO, message: `Triggering manual sync...[ ${modKey}R ]` });
      ctx.triggerSync(TriggerType.Manual);
    },
  },
  {
    id: 'toggle-sidebar',
    keys: `${modKey}\\`,
    label: 'Toggle sidebar',
    description: 'Collapse/expand the left nav panel',
    category: 'Global',
    run: (ctx) => {
      ctx.addAlert({ type: AlertType.INFO, message: `Toggling sidebar...[ ${modKey}\\ ]` });
      ctx.toggleSideBar();
    },
  },
  {
    id: 'escape',
    keys: 'Esc',
    label: 'Close panel / modal',
    description: 'Closes the note modal if open, else closes the inbox detail panel',
    category: 'Global',
    run: (ctx) => {
      if (ctx.isNoteModalOpen) {
        ctx.closeNoteModal();
      } else if (ctx.selectedItemId !== undefined) {
        ctx.closeInboxItem();
      }
    },
  },
  {
    id: 'new-note',
    keys: 'N',
    label: 'Create new note',
    description: 'Opens the standalone note modal, same as the header [+ Note] button',
    category: 'Global',
    run: (ctx) => {
      ctx.addAlert({ type: AlertType.INFO, message: 'Opening new note... [ n ]' });
      ctx.openNoteModal();
    },
  },
  {
    id: 'nav-prev-item',
    keys: 'J',
    label: 'Select previous item',
    description: 'Moves to (and opens) the previous id in the current filtered/sorted list',
    category: 'Navigation',
    run: (ctx) => {
      if (ctx.itemIds.length === 0) {
        return;
      }
      const currentIndex = ctx.selectedItemId !== undefined ? ctx.itemIds.indexOf(ctx.selectedItemId) : -1;
      const nextIndex =
        currentIndex === -1
          ? ctx.itemIds.length - 1
          : (currentIndex - 1 + ctx.itemIds.length) % ctx.itemIds.length;
      ctx.addAlert({ type: AlertType.INFO, message: 'Opening previous item... [ j ]' });
      ctx.openItem(ctx.itemIds[nextIndex]);
    },
  },
  {
    id: 'nav-next-item',
    keys: 'K',
    label: 'Select next item',
    description: 'Moves to (and opens) the next id in the current filtered/sorted list',
    category: 'Navigation',
    run: (ctx) => {
      if (ctx.itemIds.length === 0) {
        return;
      }
      const currentIndex = ctx.selectedItemId !== undefined ? ctx.itemIds.indexOf(ctx.selectedItemId) : -1;
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % ctx.itemIds.length;
      ctx.addAlert({ type: AlertType.INFO, message: 'Opening next item... [ k ]' });
      ctx.openItem(ctx.itemIds[nextIndex]);
    },
  },
  {
    id: 'toggle-save',
    keys: 'S',
    label: 'Save / Unsave',
    description: "Mirrors the detail panel's Save button (isSaved toggle) for the open item",
    category: 'Item Actions',
    run: (ctx) => {
      if (!ctx.selectedItemDetails?.id) {
        return;
      }
      ctx.toggleSave(ctx.selectedItemDetails.id, !ctx.selectedItemDetails.isSaved, ctx.selectedItemDetails.title);
    },
  },
  {
    id: 'toggle-done',
    keys: 'D',
    label: 'Mark done / not done',
    description: "Mirrors the detail panel's Mark as done button (isDone toggle) for the open item",
    category: 'Item Actions',
    run: (ctx) => {
      if (!ctx.selectedItemDetails?.id) {
        return;
      }
      ctx.toggleDone(ctx.selectedItemDetails.id, !ctx.selectedItemDetails.isDone, ctx.selectedItemDetails.title);
    },
  },
  {
    id: 'attach-note',
    keys: 'Shift+N',
    label: 'Attach note to item',
    description: "Mirrors the detail panel's Add Note button — only when an item is open and doesn't already have a note",
    category: 'Item Actions',
    run: (ctx) => {
      if (!ctx.selectedItemDetails?.id || ctx.selectedItemDetails.attachedNote) {
        return;
      }
      ctx.addAlert({ type: AlertType.INFO, message: 'Attaching note... [ Shift+N ]' });
      ctx.openNoteModal(ctx.selectedItemDetails);
    },
  },
  {
    id: 'goto-inbox',
    keys: 'G then I',
    label: 'Go to Inbox',
    description: 'Navigate to the inbox (all items, no filter)',
    category: 'Navigation',
    run: (ctx) => navigateWithAlert(ctx, 'Inbox', 'i', goToInbox()),
  },
  {
    id: 'goto-review-requests',
    keys: 'G then R',
    label: 'Go to Review Requests',
    description: 'Navigate to the inbox filtered to items awaiting your review',
    category: 'Navigation',
    run: (ctx) => navigateWithAlert(ctx, 'Review Requests', 'r', goToInbox({ reason: InboxReason.ReviewRequested })),
  },
  {
    id: 'goto-mentions',
    keys: 'G then M',
    label: 'Go to Mentions',
    description: 'Navigate to the inbox filtered to items that mention you',
    category: 'Navigation',
    run: (ctx) => navigateWithAlert(ctx, 'Mentions', 'm', goToInbox({ reason: InboxReason.Mentioned })),
  },
  {
    id: 'goto-my-prs',
    keys: 'G then P',
    label: 'Go to My PRs',
    description: 'Navigate to the inbox filtered to pull requests authored by you',
    category: 'Navigation',
    run: (ctx) =>
      navigateWithAlert(ctx, 'My PRs', 'p', goToInbox({ itemType: ItemType.PR, reason: InboxReason.Authored })),
  },
  {
    id: 'goto-ado-items',
    keys: 'G then A',
    label: 'Go to ADO Items',
    description: 'Navigate to the inbox filtered to Azure DevOps work items',
    category: 'Navigation',
    run: (ctx) => navigateWithAlert(ctx, 'ADO Items', 'a', goToInbox({ source: ItemSource.Ado })),
  },
  {
    id: 'goto-notes',
    keys: 'G then N',
    label: 'Go to Notes',
    description: 'Navigate to the standalone notes page',
    category: 'Navigation',
    run: (ctx) => navigateWithAlert(ctx, 'Notes', 'n', goToInbox({ itemType: ItemType.Note })),
  },
  {
    id: 'goto-saved',
    keys: 'G then S',
    label: 'Go to Saved',
    description: 'Navigate to the inbox filtered to saved items',
    category: 'Navigation',
    run: (ctx) => navigateWithAlert(ctx, 'Saved', 's', goToInbox({ status: ItemStatus.Saved })),
  },
  {
    id: 'goto-done',
    keys: 'G then D',
    label: 'Go to Done',
    description: 'Navigate to the inbox filtered to done items',
    category: 'Navigation',
    run: (ctx) => navigateWithAlert(ctx, 'Done', 'd', goToInbox({ status: ItemStatus.Done })),
  },
] as const satisfies readonly ShortcutAction[];

/** Union of every registered action id, derived from `SHORTCUT_ACTIONS` itself (via `as const`)
 * so `dispatch(...)` calls are checked at compile time — typo'ing an id is a type error instead
 * of a silent no-op at runtime. */
export type ShortcutActionId = (typeof SHORTCUT_ACTIONS)[number]['id'];

/** `key` (as typed after the `g` leader) → action id, derived from the ids above so the
 * leader-key mapping and the command palette listing can never drift out of sync.
 *
 * g then i	Go to Inbox		g then a	Go to ADO Items
 * g then r	Go to Review Requests	g then n	Go to Notes
 * g then m	Go to Mentions		g then s	Go to Saved items
 * g then p	Go to My PRs		g then d	Go to Done
 */
export const LEADER_KEY_ACTIONS: Record<string, ShortcutActionId> = {
  'i': 'goto-inbox',
  'r': 'goto-review-requests',
  'm': 'goto-mentions',
  'p': 'goto-my-prs',
  'a': 'goto-ado-items',
  'n': 'goto-notes',
  's': 'goto-saved',
  'd': 'goto-done',
};

/** Normalizes a keydown event into the combo string shape used as keys in `GLOBAL_KEY_ACTIONS`
 * below, e.g. `{ ctrlKey: true, key: 'F' }` → `'mod+f'`, `{ shiftKey: true, key: 'N' }` →
 * `'shift+n'`. */
export function comboKeyFor(event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'shiftKey'>): string {
  const parts: string[] = [];
  if (event.metaKey || event.ctrlKey) {
    parts.push('mod');
  }
  if (event.shiftKey) {
    parts.push('shift');
  }
  parts.push(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  return parts.join('+');
}

interface GlobalKeyBinding {
  id: ShortcutActionId;
  /** Whether the browser/OS default for this combo needs to be suppressed (e.g. Ctrl+, would
   * otherwise do nothing harmful, but Ctrl+F would open the browser's find bar). */
  preventDefault?: boolean;
}

/** `comboKeyFor(event)` result → action id, derived from the ids above so the global keyboard
 * map and the command palette listing can never drift out of sync. See the doc comment above
 * for the handful of combos handled outside this map (palette toggles, the leader key itself). */
export const GLOBAL_KEY_ACTIONS: Record<string, GlobalKeyBinding> = {
  'mod+f': { id: 'focus-search', preventDefault: true },
  '/': { id: 'focus-search', preventDefault: true },
  'mod+,': { id: 'open-settings', preventDefault: true },
  'mod+r': { id: 'trigger-sync', preventDefault: true },
  'mod+\\': { id: 'toggle-sidebar', preventDefault: true },
  'shift+n': { id: 'attach-note', preventDefault: true },
  'Escape': { id: 'escape' },
  'n': { id: 'new-note' },
  'j': { id: 'nav-prev-item' },
  'k': { id: 'nav-next-item' },
  's': { id: 'toggle-save' },
  'd': { id: 'toggle-done' },
};
