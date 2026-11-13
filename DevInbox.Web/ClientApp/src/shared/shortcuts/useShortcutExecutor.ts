import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SyncStatus } from '@api';
import useAlertStore from '@shared/store/alert.store';
import useSettingsStore from '@feature/settings/store/settings.store';
import { useInboxStore } from '@feature/inbox/store/inbox.store';
import useNoteModalStore from '@feature/notes/store/noteModal.store';
import {
  useInboxItemQuery,
  useMarkInboxItemDoneMutation,
  useSaveInboxItemMutation,
  useSyncMutation,
} from '@feature/inbox/hooks/useInboxQuery';
import { useShortcutStore } from '@shared/store/shortcut.store';
import { SHORTCUT_ACTIONS } from './shortcuts.registry';
import type { ShortcutContext } from './shortcuts.types';

/**
 * The sole consumer of `useShortcutStore`'s dispatch queue — owns every hook/mutation a
 * `ShortcutAction.run` might need, assembles them into a `ShortcutContext` each render, and executes the matching
 * action whenever a new id is dispatched (by keyboard handlers or the command palette).
 *
 * Mount this once, near the app root (see `AppLayout`) — it renders nothing.
 */
export function useShortcutExecutor() {
  const navigate = useNavigate();
  const { addAlert } = useAlertStore();
  const toggleSideBar = useSettingsStore((state) => state.toggleSideBar);
  const closeInboxItem = useInboxStore((state) => state.closeItem);
  const selectedItemId = useInboxStore((state) => state.selectedItemId);
  const openItem = useInboxStore((state) => state.openItem);
  const itemIds = useInboxStore((state) => state.itemIds);
  const isSyncRunning = useInboxStore((state) => state.status?.syncStatus === SyncStatus.Running);
  const isNoteModalOpen = useNoteModalStore((state) => state.isOpen);
  const openNoteModal = useNoteModalStore((state) => state.open);
  const closeNoteModal = useNoteModalStore((state) => state.close);
  const syncMutation = useSyncMutation();
  const { data: selectedItemDetails } = useInboxItemQuery(selectedItemId);
  const markAsDone = useMarkInboxItemDoneMutation();
  const saveItem = useSaveInboxItemMutation();

  // Always-fresh context read by the effect below via a ref, so the effect only needs to depend
  // on the dispatched action (not on every piece of state it might read).
  const ctxRef = useRef<ShortcutContext>(null!);
  ctxRef.current = {
    navigate,
    addAlert,
    toggleSideBar,
    closeInboxItem,
    openItem,
    isNoteModalOpen,
    openNoteModal,
    closeNoteModal,
    selectedItemId,
    itemIds,
    isSyncRunning,
    triggerSync: (trigger) => syncMutation.mutate(trigger),
    selectedItemDetails,
    toggleDone: (itemId, isDone, itemTitle) => markAsDone.mutate({ itemId, isDone, itemTitle }),
    toggleSave: (itemId, isSaved, itemTitle) => saveItem.mutate({ itemId, isSaved, itemTitle }),
  };

  const lastAction = useShortcutStore((state) => state.lastAction);
  useEffect(() => {
    if (!lastAction) {
      return;
    }
    const action = SHORTCUT_ACTIONS.find((candidate) => candidate.id === lastAction.id);
    action?.run(ctxRef.current);
  }, [lastAction]);
}
