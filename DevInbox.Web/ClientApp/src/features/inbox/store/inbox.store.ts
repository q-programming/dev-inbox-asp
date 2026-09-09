import { InboxStatus } from '@api';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const INBOX_STORAGE_KEY = 'devInbox.inbox';

interface InboxStore {
  status?: InboxStatus;
  setStatus: (status: InboxStatus) => void;
  updateVersion: (version: number) => void;
  selectedItemId?: number;
  openItem: (itemId?: number) => void;
  closeItem: () => void;
  selectedIds: Set<number>;
  toggleItemSelected: (itemId: number) => void;
  clearSelectedIds: () => void;
  selectionMode: boolean;
  enterSelectionMode: (itemId: number) => void;
  clear: () => void;
}

export const useInboxStore = create<InboxStore>()(
  persist(
    (set) => ({
      status: undefined,
      setStatus: (status) => set({ status }),
      updateVersion: (version) =>
        set((state) => ({
          status: state.status
            ? {
                ...state.status,
                version,
              }
            : undefined,
        })),
      openItem: (itemId) => set({ selectedItemId: itemId }),
      closeItem: () => set({ selectedItemId: undefined }),
      selectedIds: new Set<number>(),
      toggleItemSelected: (itemId) =>
        set((state) => {
          const selectedIds = new Set(state.selectedIds);
          if (selectedIds.has(itemId)) {
            selectedIds.delete(itemId);
          } else {
            selectedIds.add(itemId);
          }
          return { selectedIds, selectionMode: selectedIds.size > 0 };
        }),
      clearSelectedIds: () => set({ selectedIds: new Set<number>(), selectionMode: false }),
      selectionMode: false,
      enterSelectionMode: (itemId) =>
        set((state) => ({ selectionMode: true, selectedIds: new Set(state.selectedIds).add(itemId) })),
      clear: () =>
        set({
          status: undefined,
          selectedItemId: undefined,
          selectedIds: new Set<number>(),
          selectionMode: false,
        }),
    }),
    {
      name: INBOX_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ status: state.status, selectedItemId: state.selectedItemId }),
    }
  )
);