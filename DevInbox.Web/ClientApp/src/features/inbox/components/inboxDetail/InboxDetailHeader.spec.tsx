import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@test/setupBrowserTests';

import { ItemSource, ItemType, type InboxItemDetail } from '@api';
import { renderWithProviders } from '@test/renderWithProviders';
import { useInboxStore } from '@feature/inbox/store/inbox.store';
import { useNoteModalStore } from '@feature/notes/store/noteModal.store';
import InboxDetailHeader from './InboxDetailHeader';

function makeDetails(overrides: Partial<InboxItemDetail> = {}): InboxItemDetail {
  return {
    id: 1,
    title: 'Review authentication changes',
    itemType: ItemType.PR,
    isDone: false,
    isSaved: false,
    source: ItemSource.Github,
    ...overrides,
  };
}

describe('InboxDetailHeader', () => {
  beforeEach(() => {
    localStorage.clear();
    useInboxStore.setState({
      status: undefined,
      selectedItemId: undefined,
    });
  });

  it('renders the title text from details.title', () => {
    renderWithProviders(<InboxDetailHeader details={makeDetails({ title: 'My inbox item' })} />);

    expect(screen.getByTestId('inbox-detail-title').textContent).toBe('My inbox item');
  });

  describe('item type label', () => {
    it.each([ItemType.PR, ItemType.Issue, ItemType.WorkItem, ItemType.Note])(
      'renders %s item type',
      (itemType) => {
        renderWithProviders(<InboxDetailHeader details={makeDetails({ itemType })} />);

        expect(
          screen.getByTestId('inbox-detail-item-type-label').getAttribute('data-item-type'),
        ).toBe(itemType);
      },
    );
  });

  describe('open item button', () => {
    it('renders open-in-new button when url is provided', () => {
      renderWithProviders(
        <InboxDetailHeader details={makeDetails()} url="https://example.com/item/1" />,
      );

      const button = screen.getByTestId('inbox-detail-open-btn');
      expect(button).toBeTruthy();
      expect(button.getAttribute('href')).toBe('https://example.com/item/1');
    });

    it('does not render open-in-new button when url is undefined', () => {
      renderWithProviders(<InboxDetailHeader details={makeDetails()} />);

      expect(screen.queryByTestId('inbox-detail-open-btn')).toBeNull();
    });
  });

  describe('action state titles', () => {
    it('shows mark-done state through the title attribute', () => {
      const { rerender } = renderWithProviders(
        <InboxDetailHeader details={makeDetails({ isDone: false })} />,
      );

      expect(screen.getByTestId('inbox-detail-mark-done-btn').getAttribute('title')).toBe(
        'Mark as done',
      );

      rerender(<InboxDetailHeader details={makeDetails({ isDone: true })} />);

      expect(screen.getByTestId('inbox-detail-mark-done-btn').getAttribute('title')).toBe(
        'Marked as done',
      );
    });

    it('shows save state through the title attribute', () => {
      const { rerender } = renderWithProviders(
        <InboxDetailHeader details={makeDetails({ isSaved: false })} />,
      );

      expect(screen.getByTestId('inbox-detail-save-btn').getAttribute('title')).toBe('Save');

      rerender(<InboxDetailHeader details={makeDetails({ isSaved: true })} />);

      expect(screen.getByTestId('inbox-detail-save-btn').getAttribute('title')).toBe('Saved');
    });
  });

  describe('mark as done button', () => {
    it('calls the mark-done API with the toggled isDone value when clicked', async () => {
      const user = userEvent.setup();
      let receivedIsDone: string | null = null;
      server.use(
        http.post('/api/inbox/item/:id/done', ({ request }) => {
          receivedIsDone = new URL(request.url).searchParams.get('isDone');
          return new HttpResponse(null, { status: 204 });
        }),
      );

      renderWithProviders(<InboxDetailHeader details={makeDetails({ id: 7, isDone: false })} />);

      await user.click(screen.getByTestId('inbox-detail-mark-done-btn'));

      await waitFor(() => expect(receivedIsDone).toBe('true'));
    });

    it('calls the mark-done API to unmark an already-done item', async () => {
      const user = userEvent.setup();
      let receivedIsDone: string | null = null;
      server.use(
        http.post('/api/inbox/item/:id/done', ({ request }) => {
          receivedIsDone = new URL(request.url).searchParams.get('isDone');
          return new HttpResponse(null, { status: 204 });
        }),
      );

      renderWithProviders(<InboxDetailHeader details={makeDetails({ id: 7, isDone: true })} />);

      await user.click(screen.getByTestId('inbox-detail-mark-done-btn'));

      await waitFor(() => expect(receivedIsDone).toBe('false'));
    });

    it('does not call the API when the item has no id', async () => {
      const user = userEvent.setup();
      let callCount = 0;
      server.use(
        http.post('/api/inbox/item/:id/done', () => {
          callCount += 1;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      renderWithProviders(<InboxDetailHeader details={makeDetails({ id: undefined })} />);

      await user.click(screen.getByTestId('inbox-detail-mark-done-btn'));

      expect(callCount).toBe(0);
    });
  });

  describe('save button', () => {
    it('calls the save API with the toggled isSaved value when clicked', async () => {
      const user = userEvent.setup();
      let receivedSave: string | null = null;
      server.use(
        http.post('/api/inbox/item/:id/save', ({ request }) => {
          receivedSave = new URL(request.url).searchParams.get('save');
          return new HttpResponse(null, { status: 204 });
        }),
      );

      renderWithProviders(<InboxDetailHeader details={makeDetails({ id: 7, isSaved: false })} />);

      await user.click(screen.getByTestId('inbox-detail-save-btn'));

      await waitFor(() => expect(receivedSave).toBe('true'));
    });

    it('calls the save API to unsave an already-saved item', async () => {
      const user = userEvent.setup();
      let receivedSave: string | null = null;
      server.use(
        http.post('/api/inbox/item/:id/save', ({ request }) => {
          receivedSave = new URL(request.url).searchParams.get('save');
          return new HttpResponse(null, { status: 204 });
        }),
      );

      renderWithProviders(<InboxDetailHeader details={makeDetails({ id: 7, isSaved: true })} />);

      await user.click(screen.getByTestId('inbox-detail-save-btn'));

      await waitFor(() => expect(receivedSave).toBe('false'));
    });

    it('does not call the API when the item has no id', async () => {
      const user = userEvent.setup();
      let callCount = 0;
      server.use(
        http.post('/api/inbox/item/:id/save', () => {
          callCount += 1;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      renderWithProviders(<InboxDetailHeader details={makeDetails({ id: undefined })} />);

      await user.click(screen.getByTestId('inbox-detail-save-btn'));

      expect(callCount).toBe(0);
    });
  });

  describe('add note button', () => {
    it('opens the note modal attached to the current item when clicked', async () => {
      const user = userEvent.setup();
      useNoteModalStore.setState({ isOpen: false, attachedToInboxItemId: undefined, title: undefined });

      renderWithProviders(
        <InboxDetailHeader details={makeDetails({ id: 9, title: 'PR to review' })} />,
      );

      await user.click(screen.getByTestId('inbox-detail-add-note-btn'));

      expect(useNoteModalStore.getState().isOpen).toBe(true);
      expect(useNoteModalStore.getState().attachedToInboxItemId).toBe(9);
      expect(useNoteModalStore.getState().title).toBe('PR to review');
    });

    it('does not render the add-note button for note items', () => {
      renderWithProviders(<InboxDetailHeader details={makeDetails({ source: ItemSource.Note })} />);

      expect(screen.queryByTestId('inbox-detail-add-note-btn')).toBeNull();
    });

    it('does not render the add-note button when the item already has an attached note', () => {
      renderWithProviders(
        <InboxDetailHeader
          details={makeDetails({ attachedNote: { noteId: 1, title: 'Existing note' } })}
        />,
      );

      expect(screen.queryByTestId('inbox-detail-add-note-btn')).toBeNull();
    });
  });

  it('clicking close calls closeItem on the store', async () => {
    const user = userEvent.setup();
    useInboxStore.setState({ selectedItemId: 42 });

    renderWithProviders(<InboxDetailHeader details={makeDetails()} />);

    await user.click(screen.getByTestId('inbox-detail-close-btn'));

    expect(useInboxStore.getState().selectedItemId).toBeUndefined();
  });

  describe('integration icon', () => {
    it.each([
      [ItemSource.Ado, 'Ado'],
      [ItemSource.Github, 'Github'],
      [ItemSource.Note, 'note'],
    ])('renders the expected icon for %s', (source, altText) => {
      renderWithProviders(<InboxDetailHeader details={makeDetails({ source })} />);

      expect(screen.getByAltText(altText)).toBeTruthy();
    });

    it('does not render an integration icon when source is missing', () => {
      renderWithProviders(<InboxDetailHeader details={makeDetails({ source: undefined })} />);

      expect(screen.queryByRole('img')).toBeNull();
    });
  });
});
