import { beforeEach, describe, expect, it } from 'vitest';
import { ItemSource, ItemType, type InboxItemDetail } from '@api';
import { useNoteModalStore } from './noteModal.store';

const makeDetails = (overrides: Partial<InboxItemDetail> = {}): InboxItemDetail => ({
  id: 42,
  title: 'Test item',
  source: ItemSource.Github,
  itemType: ItemType.PR,
  isDone: false,
  isSaved: false,
  ...overrides,
});

describe('useNoteModalStore', () => {
  beforeEach(() => {
    useNoteModalStore.setState({ isOpen: false, attachedToInboxItemId: undefined });
  });

  it('should have a closed initial state with no attached item', () => {
    const state = useNoteModalStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.attachedToInboxItemId).toBeUndefined();
  });

  it('should open as a standalone note when called with no argument', () => {
    useNoteModalStore.getState().open();

    const state = useNoteModalStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.attachedToInboxItemId).toBeUndefined();
  });

  it('should open attached to an inbox item when called with details', () => {
    useNoteModalStore.getState().open(makeDetails({ id: 42, title: 'PR #42' }));

    const state = useNoteModalStore.getState();
    expect(state.isOpen).toBe(true);
    expect(state.attachedToInboxItemId).toBe(42);
    expect(state.title).toBe('PR #42');
  });

  it('should reset isOpen and attachedToInboxItemId when closed', () => {
    useNoteModalStore.getState().open(makeDetails({ id: 7 }));
    expect(useNoteModalStore.getState().isOpen).toBe(true);

    useNoteModalStore.getState().close();

    const state = useNoteModalStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.attachedToInboxItemId).toBeUndefined();
  });

  it('should reset even when the store was never opened', () => {
    useNoteModalStore.getState().close();

    const state = useNoteModalStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.attachedToInboxItemId).toBeUndefined();
  });
});
