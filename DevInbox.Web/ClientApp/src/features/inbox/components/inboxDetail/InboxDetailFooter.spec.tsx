import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@test/renderWithProviders';
import { useInboxStore } from '@feature/inbox/store/inbox.store';
import useNoteModalStore from '@feature/notes/store/noteModal.store';
import InboxDetailFooter from './InboxDetailFooter';
import { makeInboxItemDetail } from './inboxDetail.testUtils';

beforeEach(() => {
  useInboxStore.setState({
    status: undefined,
    selectedItemId: undefined,
    openItem: vi.fn(),
    closeItem: () => useInboxStore.setState({ selectedItemId: undefined }),
    clear: () => useInboxStore.setState({ status: undefined, selectedItemId: undefined }),
    setStatus: (status) => useInboxStore.setState({ status }),
    updateVersion: (version) =>
      useInboxStore.setState((state) => ({
        status: state.status ? { ...state.status, version } : undefined,
      })),
  });

  useNoteModalStore.setState({
    isOpen: false,
    attachedToInboxItemId: undefined,
    open: vi.fn(),
    close: () => useNoteModalStore.setState({ isOpen: false, attachedToInboxItemId: undefined }),
  });
});

describe('InboxDetailFooter', () => {
  describe('when an attached note is present', () => {
    it('renders the attached note card with title and body, and hides the Add Note button', () => {
      const details = makeInboxItemDetail({
        attachedNote: { noteId: 1, inboxItemId: 42, title: 'Follow up', body: 'Remember to follow up on this' },
      });

      renderWithProviders(<InboxDetailFooter details={details} />);

      expect(screen.getByTestId('inbox-detail-attached-note')).toBeTruthy();
      expect(screen.getByText('Follow up')).toBeTruthy();
      expect(screen.getByText('Remember to follow up on this')).toBeTruthy();
      expect(screen.queryByTestId('inbox-detail-add-note-button')).toBeNull();
    });

    it('calls openItem with the attached note inboxItemId when clicked', async () => {
      const user = userEvent.setup();
      const openItem = vi.fn();
      useInboxStore.setState({ openItem });

      const details = makeInboxItemDetail({
        attachedNote: { noteId: 1, inboxItemId: 42, title: 'Follow up', body: 'Remember to follow up' },
      });

      renderWithProviders(<InboxDetailFooter details={details} />);

      await user.click(screen.getByTestId('inbox-detail-attached-note'));

      expect(openItem).toHaveBeenCalledWith(42);
    });

    it('does not call openItem when the attached note has no inboxItemId', async () => {
      const user = userEvent.setup();
      const openItem = vi.fn();
      useInboxStore.setState({ openItem });

      const details = makeInboxItemDetail({
        attachedNote: { noteId: 1, inboxItemId: undefined, title: 'Follow up', body: 'Remember to follow up' },
      });

      renderWithProviders(<InboxDetailFooter details={details} />);

      await user.click(screen.getByTestId('inbox-detail-attached-note'));

      expect(openItem).not.toHaveBeenCalled();
    });
  });

  describe('when no attached note is present', () => {
    it('renders the Add Note button and hides the attached note card', () => {
      const details = makeInboxItemDetail({ attachedNote: undefined });

      renderWithProviders(<InboxDetailFooter details={details} />);

      expect(screen.getByTestId('inbox-detail-add-note-button')).toBeTruthy();
      expect(screen.queryByTestId('inbox-detail-attached-note')).toBeNull();
    });

    it('calls open with the inbox item id when the Add Note button is clicked', async () => {
      const user = userEvent.setup();
      const open = vi.fn();
      useNoteModalStore.setState({ open });

      const details = makeInboxItemDetail({ id: 77, attachedNote: undefined });

      renderWithProviders(<InboxDetailFooter details={details} />);

      await user.click(screen.getByTestId('inbox-detail-add-note-button'));

      expect(open).toHaveBeenCalledWith(details);
    });
  });
});
