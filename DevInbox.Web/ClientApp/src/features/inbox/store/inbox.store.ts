import { InboxStatus } from '@api';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const INBOX_STORAGE_KEY = 'devInbox.inbox';

interface InboxStore {
  status?: InboxStatus;
  setStatus: (status: InboxStatus) => void;
  updateVersion: (version: number) => void;
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

      clear: () => set({ status: undefined }),
    }),
    {
      name: INBOX_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
);