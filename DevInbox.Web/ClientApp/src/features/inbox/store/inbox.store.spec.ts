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
    selectedIds: new Set(),
    selectionMode: false,
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

    it('should also clear any selected ids', () => {
      useInboxStore.getState().toggleItemSelected(1);
      useInboxStore.getState().toggleItemSelected(2);

      useInboxStore.getState().clear();

      expect(useInboxStore.getState().selectedIds.size).toBe(0);
    });
  });

  describe('toggleItemSelected and clearSelectedIds', () => {
    it('should add an id the first time it is toggled and remove it the second time', () => {
      expect(useInboxStore.getState().selectedIds.has(5)).toBe(false);

      useInboxStore.getState().toggleItemSelected(5);
      expect(useInboxStore.getState().selectedIds.has(5)).toBe(true);

      useInboxStore.getState().toggleItemSelected(5);
      expect(useInboxStore.getState().selectedIds.has(5)).toBe(false);
    });

    it('should track multiple selected ids independently', () => {
      useInboxStore.getState().toggleItemSelected(1);
      useInboxStore.getState().toggleItemSelected(2);

      expect([...useInboxStore.getState().selectedIds].sort()).toEqual([1, 2]);
    });

    it('should clear all selected ids at once', () => {
      useInboxStore.getState().toggleItemSelected(1);
      useInboxStore.getState().toggleItemSelected(2);

      useInboxStore.getState().clearSelectedIds();

      expect(useInboxStore.getState().selectedIds.size).toBe(0);
    });

    it('should exit selection mode once the last selected id is toggled off', () => {
      useInboxStore.getState().toggleItemSelected(1);
      expect(useInboxStore.getState().selectionMode).toBe(true);

      useInboxStore.getState().toggleItemSelected(1);

      expect(useInboxStore.getState().selectionMode).toBe(false);
    });
  });

  describe('enterSelectionMode', () => {
    it('should enable selection mode and select the given item', () => {
      useInboxStore.getState().enterSelectionMode(9);

      expect(useInboxStore.getState().selectionMode).toBe(true);
      expect(useInboxStore.getState().selectedIds.has(9)).toBe(true);
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

    it('should not persist selectedIds — a reload should never restore a stale multi-selection', () => {
      useInboxStore.getState().toggleItemSelected(42);

      const raw = localStorage.getItem(INBOX_STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);

      expect(parsed.state.selectedIds).toBeUndefined();
    });
  });
});
