import { SyncStatus, type InboxStatus } from '@api';
import { beforeEach, describe, expect, it } from 'vitest';
import { INBOX_STORAGE_KEY, useInboxStore } from './inbox.store';

const createStatus = (overrides: Partial<InboxStatus> = {}): InboxStatus => ({
  syncStatus: SyncStatus.Running,
  version: 1,
  ...overrides,
});

beforeEach(() => {
  localStorage.clear();
  useInboxStore.setState({
    status: undefined,
    selectedItemId: undefined,
  });
});

describe('useInboxStore', () => {
  describe('setStatus', () => {
    it('should store the provided status', () => {
      const status = createStatus({ version: 3 });

      useInboxStore.getState().setStatus(status);

      expect(useInboxStore.getState().status).toEqual(status);
    });
  });

  describe('updateVersion', () => {
    it('should update the version when status exists', () => {
      useInboxStore.getState().setStatus(createStatus({ version: 1 }));

      useInboxStore.getState().updateVersion(7);

      expect(useInboxStore.getState().status).toEqual(
        expect.objectContaining({
          syncStatus: SyncStatus.Running,
          version: 7,
        }),
      );
    });

    it('should keep status undefined when called without an existing status', () => {
      useInboxStore.getState().updateVersion(7);

      expect(useInboxStore.getState().status).toBeUndefined();
    });
  });

  describe('openItem and closeItem', () => {
    it('should set and clear the selected item id', () => {
      useInboxStore.getState().openItem(42);
      expect(useInboxStore.getState().selectedItemId).toBe(42);

      useInboxStore.getState().closeItem();
      expect(useInboxStore.getState().selectedItemId).toBeUndefined();
    });

    it('should allow opening with an undefined item id', () => {
      useInboxStore.getState().openItem(undefined);

      expect(useInboxStore.getState().selectedItemId).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should reset both status and selectedItemId', () => {
      useInboxStore.getState().setStatus(createStatus({ version: 9 }));
      useInboxStore.getState().openItem(100);

      useInboxStore.getState().clear();

      expect(useInboxStore.getState().status).toBeUndefined();
      expect(useInboxStore.getState().selectedItemId).toBeUndefined();
    });
  });

  describe('localStorage persistence', () => {
    it('should persist status and selectedItemId after actions', () => {
      useInboxStore.getState().setStatus(createStatus({ version: 5 }));
      useInboxStore.getState().openItem(77);

      const raw = localStorage.getItem(INBOX_STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);

      expect(parsed.state.status).toEqual(
        expect.objectContaining({
          syncStatus: SyncStatus.Running,
          version: 5,
        }),
      );
      expect(parsed.state.selectedItemId).toBe(77);
    });

    it('should persist cleared values as undefined state fields', () => {
      useInboxStore.getState().setStatus(createStatus({ version: 2 }));
      useInboxStore.getState().openItem(11);

      useInboxStore.getState().clear();

      const raw = localStorage.getItem(INBOX_STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);

      expect(parsed.state.status).toBeUndefined();
      expect(parsed.state.selectedItemId).toBeUndefined();
    });
  });
});
