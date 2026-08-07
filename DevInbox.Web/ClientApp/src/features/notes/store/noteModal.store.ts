import { InboxItemDetail } from '@api';
import { create } from 'zustand';

/**
 * Drives the global "add note" modal (see NoteFormModal). A single instance is
 * rendered once in AppLayout; any component can open it — either as a
 * standalone note (no target) or attached to an existing inbox item (e.g. the
 * "Add note" action on a GitHub PR / ADO work item detail).
 */
interface NoteModalState {
  isOpen: boolean;
  /** InboxItem.id the created note should be attached to, or undefined for a standalone note. */
  attachedToInboxItemId?: number;
  open: (details?: InboxItemDetail) => void;
  title?: string;
  close: () => void;
}

export const useNoteModalStore = create<NoteModalState>((set) => ({
  isOpen: false,
  attachedToInboxItemId: undefined,
  title: undefined,
  open: (details) => set({ isOpen: true, attachedToInboxItemId: details?.id, title: details?.title }),
  close: () => set({ isOpen: false, attachedToInboxItemId: undefined, title: undefined }),
}));

export default useNoteModalStore;
