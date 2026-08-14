import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@test/setupBrowserTests';
import { renderWithProviders } from '@test/renderWithProviders';
import useAlertStore from '@shared/store/alert.store';
import NoteFormModal from './NoteFormModal';
import { useNoteModalStore } from '../store/noteModal.store';
import { useInboxStore } from '@feature/inbox/store/inbox.store';

beforeEach(() => {
  useNoteModalStore.setState({
    isOpen: true,
    attachedToInboxItemId: undefined,
    title: undefined,
    close: () => useNoteModalStore.setState({ isOpen: false, attachedToInboxItemId: undefined, title: undefined }),
  });
  useInboxStore.setState({ selectedItemId: undefined, openItem: vi.fn(), closeItem: vi.fn() });
  useAlertStore.setState({ alerts: [] });
});

describe('NoteFormModal', () => {
  it('shows the standalone title when there is no attached item', () => {
    renderWithProviders(<NoteFormModal />);

    expect(screen.getByRole('heading', { name: 'Add note' })).toBeTruthy();
  });

  it('shows the attached-item title when attachedToInboxItemId is set', () => {
    useNoteModalStore.setState({ attachedToInboxItemId: 42, title: 'PR #42' });

    renderWithProviders(<NoteFormModal />);

    expect(screen.getByRole('heading', { name: 'Add note to "PR #42"' })).toBeTruthy();
  });

  it('ignores selected inbox item for standalone modal title and payload', async () => {
    const user = userEvent.setup();
    let requestBody: Record<string, unknown> | undefined;
    server.use(
      http.post('/api/notes', async ({ request }) => {
        requestBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ noteId: 1 }, { status: 201 });
      }),
    );

    useInboxStore.setState({ selectedItemId: 99 });
    useNoteModalStore.setState({ attachedToInboxItemId: undefined, title: undefined });

    renderWithProviders(<NoteFormModal />);

    expect(screen.getByRole('heading', { name: 'Add note' })).toBeTruthy();

    await user.type(screen.getByTestId('note-form-title').querySelector('input')!, 'Standalone');
    await user.click(screen.getByTestId('note-form-submit'));
    await waitFor(() => expect(requestBody).toBeDefined());

    expect(requestBody?.attachedToInboxItemId).toBeUndefined();
  });

  it('submits the note payload (with attachedToInboxItemId), closes the modal and shows a success alert', async () => {
    const user = userEvent.setup();
    let requestBody: Record<string, unknown> | undefined;
    server.use(
      http.post('/api/notes', async ({ request }) => {
        requestBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ noteId: 1, title: requestBody.title }, { status: 201 });
      }),
    );

    useNoteModalStore.setState({ attachedToInboxItemId: 42 });
    renderWithProviders(<NoteFormModal />);

    await user.type(screen.getByTestId('note-form-title').querySelector('input')!, 'My note');
    await user.click(screen.getByTestId('note-form-submit'));

    await waitFor(() => expect(useNoteModalStore.getState().isOpen).toBe(false));

    expect(requestBody).toMatchObject({ title: 'My note', attachedToInboxItemId: 42 });
    expect(useAlertStore.getState().alerts.some((alert) => alert.message === 'Note added.')).toBe(true);
  });

  it('does not send attachedToInboxItemId for a standalone note', async () => {
    const user = userEvent.setup();
    let requestBody: Record<string, unknown> | undefined;
    server.use(
      http.post('/api/notes', async ({ request }) => {
        requestBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ noteId: 1 }, { status: 201 });
      }),
    );

    renderWithProviders(<NoteFormModal />);

    await user.type(screen.getByTestId('note-form-title').querySelector('input')!, 'Standalone note');
    await user.click(screen.getByTestId('note-form-submit'));

    await waitFor(() => expect(requestBody).toBeDefined());

    expect(requestBody?.attachedToInboxItemId).toBeUndefined();
  });

  it('shows an error alert and keeps the modal open when the request fails', async () => {
    const user = userEvent.setup();
    server.use(http.post('/api/notes', () => HttpResponse.json({}, { status: 500 })));

    renderWithProviders(<NoteFormModal />);

    await user.type(screen.getByTestId('note-form-title').querySelector('input')!, 'Failing note');
    await user.click(screen.getByTestId('note-form-submit'));

    await waitFor(() =>
      expect(useAlertStore.getState().alerts.some((alert) => alert.message === 'Failed to add note.')).toBe(true),
    );
    expect(useNoteModalStore.getState().isOpen).toBe(true);
  });

  it('calls close() when the close icon button is clicked', async () => {
    const user = userEvent.setup();

    renderWithProviders(<NoteFormModal />);

    await user.click(screen.getByTestId('note-form-modal-close'));

    expect(useNoteModalStore.getState().isOpen).toBe(false);
  });
});
