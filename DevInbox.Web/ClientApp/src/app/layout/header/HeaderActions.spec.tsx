import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ItemSource, ItemType, type InboxItemDetail } from '@api';
import { renderWithProviders } from '@test/renderWithProviders';
import HeaderActions from './HeaderActions';

const openNoteModalMock = vi.fn();
const inboxStoreState = { selectedItemId: undefined as number | undefined };
const inboxItemQueryState = { data: undefined as InboxItemDetail | undefined };

vi.mock('@feature/notes/store/noteModal.store', () => ({
  useNoteModalStore: (selector: (state: { open: typeof openNoteModalMock }) => unknown) =>
    selector({ open: openNoteModalMock }),
}));

vi.mock('@feature/inbox/store/inbox.store', () => ({
  useInboxStore: (selector?: (state: typeof inboxStoreState) => unknown) =>
    selector ? selector(inboxStoreState) : inboxStoreState,
}));

vi.mock('@feature/inbox/hooks/useInboxQuery', () => ({
  useInboxItemQuery: () => inboxItemQueryState,
}));

vi.mock('../profile/ProfileMenu.tsx', () => ({
  default: () => <div data-testid="profile-menu" />,
}));

vi.mock('./InboxSyncStatus', () => ({
  InboxSyncStatus: () => <div data-testid="inbox-sync-status" />,
}));

const makeDetails = (overrides: Partial<InboxItemDetail> = {}): InboxItemDetail => ({
  id: 101,
  title: 'Test item',
  source: ItemSource.Github,
  itemType: ItemType.PR,
  isDone: false,
  isSaved: false,
  ...overrides,
});

describe('HeaderActions', () => {
  beforeEach(() => {
    openNoteModalMock.mockReset();
    inboxStoreState.selectedItemId = undefined;
    inboxItemQueryState.data = undefined;
  });

  it('opens standalone note modal from main button', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HeaderActions />);

    await user.click(screen.getByTestId('header-add-note-btn'));

    expect(openNoteModalMock).toHaveBeenCalledWith();
    expect(screen.queryByTestId('header-add-note-options-btn')).toBeNull();
  });

  it('shows add-note options when selected item has no attached note and opens attached modal', async () => {
    const user = userEvent.setup();
    inboxStoreState.selectedItemId = 101;
    const details = makeDetails({
      id: 101,
      source: ItemSource.Github,
      attachedNote: undefined,
    });
    inboxItemQueryState.data = details;

    renderWithProviders(<HeaderActions />);

    await user.click(screen.getByTestId('header-add-note-options-btn'));
    await user.click(screen.getByTestId('header-add-note-menu-attached'));

    expect(openNoteModalMock).toHaveBeenCalledWith(details);
  });

  it('hides add-note options when selected item already has attached note', () => {
    inboxStoreState.selectedItemId = 101;
    inboxItemQueryState.data = makeDetails({
      id: 101,
      attachedNote: {
        noteId: 7,
        inboxItemId: 555,
        title: 'Already attached',
      },
    });

    renderWithProviders(<HeaderActions />);

    expect(screen.queryByTestId('header-add-note-options-btn')).toBeNull();
  });
});
