import type { NavigateFunction } from 'react-router-dom';
import type { TriggerType, InboxItemDetail } from '@api';
import type { AlertMessage } from '@shared/store/alert.store';

/**
 * Everything a shortcut action's `run` might need. Assembled once by `useShortcutExecutor`
 * (the single component/hook that owns every store/mutation involved) and handed to whichever
 * action was dispatched — actions never call hooks themselves, they just read/call this context.
 */
export interface ShortcutContext {
  navigate: NavigateFunction;
  addAlert: (alert: AlertMessage) => void;
  toggleSideBar: () => void;
  closeInboxItem: () => void;
  openItem: (itemId: number) => void;
  isNoteModalOpen: boolean;
  openNoteModal: (details?: InboxItemDetail) => void;
  closeNoteModal: () => void;
  selectedItemId?: number;
  itemIds: number[];
  isSyncRunning: boolean;
  triggerSync: (trigger: TriggerType) => void;
  selectedItemDetails?: InboxItemDetail;
  toggleDone: (itemId: number, isDone: boolean, itemTitle?: string) => void;
  toggleSave: (itemId: number, isSaved: boolean, itemTitle?: string) => void;
}

/** Grouping shown as a section in the command palette listing. */
export type ShortcutCategory = 'Global' | 'Navigation' | 'Item Actions';

/** A single, listable/executable shortcut — the source of truth for both the keyboard
 * handlers (which just dispatch an id) and the command palette (which lists + dispatches too). */
export interface ShortcutAction {
  id: string;
  /** Display-only key combo, e.g. `${modKey}R` or `G then R`. */
  keys: string;
  label: string;
  description: string;
  category: ShortcutCategory;
  run: (ctx: ShortcutContext) => void;
}
