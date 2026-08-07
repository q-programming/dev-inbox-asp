import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { ItemSource, ItemType } from '@api';
import { server } from '@test/setupBrowserTests';
import { renderWithProviders } from '@test/renderWithProviders';
import useAlertStore from '@shared/store/alert.store';
import { useInboxStore } from '@feature/inbox/store/inbox.store';
import NoteDetail from './NoteDetail';
import { makeInboxItemDetail } from '../inboxDetail.testUtils';

beforeEach(() => {
  useAlertStore.setState({ alerts: [] });
  useInboxStore.setState({
    selectedItemId: undefined,
    openItem: () => {},
    closeItem: () => {},
  });
});

describe('NoteDetail', () => {
  it('renders the item title and the embedded form prefilled from the note', () => {
    renderWithProviders(
      <NoteDetail
        details={makeInboxItemDetail({
          title: 'Note item title',
          source: ItemSource.Note,
          itemType: ItemType.Note,
          ado: undefined,
          note: {
            noteId: 7,
            title: 'My note title',
            body: 'My note body',
            tags: ['urgent'],
          },
        })}
      />,
    );

    expect(screen.getByTestId('note-detail')).toBeInTheDocument();
    expect(screen.getByText('Note item title')).toBeTruthy();
    expect(screen.getByTestId('note-form-title').querySelector('input')).toHaveValue('My note title');
    expect(screen.getByTestId('note-form-body').querySelector('textarea')).toHaveValue('My note body');
  });

  it('submits the update mutation with the note id and payload, then shows a success alert', async () => {
    const user = userEvent.setup();
    let requestBody: Record<string, unknown> | undefined;
    server.use(
      http.put('/api/notes/:id', async ({ request, params }) => {
        requestBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ noteId: Number(params.id), title: requestBody.title });
      }),
    );

    renderWithProviders(
      <NoteDetail
        details={makeInboxItemDetail({
          source: ItemSource.Note,
          itemType: ItemType.Note,
          ado: undefined,
          note: { noteId: 7, title: 'Original title', body: 'Original body' },
        })}
      />,
    );

    const titleInput = screen.getByTestId('note-form-title').querySelector('input')!;
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated title');
    await user.click(screen.getByTestId('note-form-submit'));

    await waitFor(() => expect(requestBody).toBeDefined());
    expect(requestBody).toMatchObject({ title: 'Updated title', body: 'Original body' });

    await waitFor(() =>
      expect(useAlertStore.getState().alerts.some((alert) => alert.message === 'Note updated.')).toBe(true),
    );
  });

  it('shows an error alert when the update request fails', async () => {
    const user = userEvent.setup();
    server.use(http.put('/api/notes/:id', () => HttpResponse.json({}, { status: 500 })));

    renderWithProviders(
      <NoteDetail
        details={makeInboxItemDetail({
          source: ItemSource.Note,
          itemType: ItemType.Note,
          ado: undefined,
          note: { noteId: 7, title: 'Original title', body: 'Original body' },
        })}
      />,
    );

    const titleInput = screen.getByTestId('note-form-title').querySelector('input')!;
    await user.clear(titleInput);
    await user.type(titleInput, 'Will fail');
    await user.click(screen.getByTestId('note-form-submit'));

    await waitFor(() =>
      expect(useAlertStore.getState().alerts.some((alert) => alert.message === 'Failed to update note.')).toBe(true),
    );
  });

  it('renders the linked-item banner and navigates to it when "Go to item" is clicked', async () => {
    const user = userEvent.setup();
    const openItem = vi.fn();
    useInboxStore.setState({ openItem });

    renderWithProviders(
      <NoteDetail
        details={makeInboxItemDetail({
          source: ItemSource.Note,
          itemType: ItemType.Note,
          ado: undefined,
          note: {
            noteId: 7,
            title: 'Attached note',
            linkedItem: { id: '99', title: 'Linked PR title' },
          },
        })}
      />,
    );

    const banner = screen.getByTestId('note-detail-linked-item');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('Linked PR title');

    await user.click(screen.getByTestId('note-detail-go-to-item'));

    expect(openItem).toHaveBeenCalledWith(99);
  });

  it('does not render the linked-item banner when the note is not attached to anything', () => {
    renderWithProviders(
      <NoteDetail
        details={makeInboxItemDetail({
          source: ItemSource.Note,
          itemType: ItemType.Note,
          ado: undefined,
          note: { noteId: 7, title: 'Standalone note' },
        })}
      />,
    );

    expect(screen.queryByTestId('note-detail-linked-item')).toBeNull();
  });

  it('opens confirmation modal on delete and cancels without calling API', async () => {
    const user = userEvent.setup();
    const deleteSpy = vi.fn();
    server.use(
      http.delete('/api/notes/:id', async () => {
        deleteSpy();
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithProviders(
      <NoteDetail
        details={makeInboxItemDetail({
          id: 17,
          source: ItemSource.Note,
          itemType: ItemType.Note,
          ado: undefined,
          note: { noteId: 7, title: 'Standalone note' },
        })}
      />,
    );

    await user.click(screen.getByTestId('note-form-delete'));
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    await user.click(screen.getByTestId('confirm-modal-cancel'));

    await waitFor(() => expect(screen.queryByTestId('confirm-modal')).toBeNull());
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('confirms delete, calls API, closes the item and shows success alert', async () => {
    const user = userEvent.setup();
    const closeItem = vi.fn();
    useInboxStore.setState({ closeItem });
    let deletedId: string | undefined;
    server.use(
      http.delete('/api/notes/:id', async ({ params }) => {
        deletedId = String(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithProviders(
      <NoteDetail
        details={makeInboxItemDetail({
          id: 17,
          source: ItemSource.Note,
          itemType: ItemType.Note,
          ado: undefined,
          note: {
            noteId: 7,
            title: 'Attached note',
            linkedItem: { id: '99', title: 'Linked PR title' },
          },
        })}
      />,
    );

    await user.click(screen.getByTestId('note-form-delete'));
    await user.click(screen.getByTestId('confirm-modal-confirm'));

    await waitFor(() => expect(deletedId).toBe('7'));
    await waitFor(() =>
      expect(useAlertStore.getState().alerts.some((alert) => alert.message === 'Note deleted.')).toBe(true),
    );
    expect(closeItem).toHaveBeenCalledTimes(1);
  });

  it('keeps the panel open (does not call closeItem) and shows an error alert when delete fails', async () => {
    const user = userEvent.setup();
    const closeItem = vi.fn();
    useInboxStore.setState({ closeItem });
    server.use(http.delete('/api/notes/:id', () => HttpResponse.json({}, { status: 500 })));

    renderWithProviders(
      <NoteDetail
        details={makeInboxItemDetail({
          id: 17,
          source: ItemSource.Note,
          itemType: ItemType.Note,
          ado: undefined,
          note: { noteId: 7, title: 'Standalone note' },
        })}
      />,
    );

    await user.click(screen.getByTestId('note-form-delete'));
    await user.click(screen.getByTestId('confirm-modal-confirm'));

    await waitFor(() =>
      expect(useAlertStore.getState().alerts.some((alert) => alert.message === 'Failed to delete note.')).toBe(true),
    );
    expect(closeItem).not.toHaveBeenCalled();
    expect(screen.getByTestId('note-detail')).toBeInTheDocument();
  });
});
