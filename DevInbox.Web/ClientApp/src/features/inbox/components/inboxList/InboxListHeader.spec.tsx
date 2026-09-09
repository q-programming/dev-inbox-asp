import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@test/renderWithProviders';
import { server } from '@test/setupBrowserTests';
import { useInboxStore } from '@feature/inbox/store/inbox.store';
import InboxListHeader from './InboxListHeader';

beforeEach(() => {
  localStorage.clear();
  useInboxStore.setState({
    selectedIds: new Set(),
    clearSelectedIds: () => useInboxStore.setState({ selectedIds: new Set() }),
    toggleItemSelected: (itemId) =>
      useInboxStore.setState((state) => {
        const selectedIds = new Set(state.selectedIds);
        selectedIds.has(itemId) ? selectedIds.delete(itemId) : selectedIds.add(itemId);
        return { selectedIds };
      }),
  });
});

describe('InboxListHeader', () => {
  describe('sort control', () => {
    it('shows "Newest activity" as the default sort label', () => {
      renderWithProviders(<InboxListHeader />, { initialEntries: ['/inbox'] });

      expect(screen.getByTestId('inbox-sort-btn')).toHaveTextContent('Sort: Newest activity');
    });

    it('reflects the sort value already present in the URL', () => {
      renderWithProviders(<InboxListHeader />, { initialEntries: ['/inbox?sort=PriorityDesc'] });

      expect(screen.getByTestId('inbox-sort-btn')).toHaveTextContent('Sort: Priority');
    });

    it('updates the URL and the displayed label when a different sort option is chosen', async () => {
      const user = userEvent.setup();
      renderWithProviders(<InboxListHeader />, { initialEntries: ['/inbox'] });

      await user.click(screen.getByTestId('inbox-sort-btn'));
      await user.click(await screen.findByTestId('inbox-sort-option-CreatedDesc'));

      await waitFor(() =>
        expect(screen.getByTestId('inbox-sort-btn')).toHaveTextContent('Sort: Recently created'),
      );
    });

    it('does not show the bulk actions button when nothing is selected', () => {
      renderWithProviders(<InboxListHeader />, { initialEntries: ['/inbox'] });

      expect(screen.queryByTestId('inbox-bulk-actions-btn')).toBeNull();
      expect(screen.queryByTestId('inbox-list-selection-count')).toBeNull();
    });
  });

  describe('bulk actions', () => {
    it('shows the selection count and an actions button once items are selected', () => {
      useInboxStore.setState({ selectedIds: new Set([1, 2, 3]) });

      renderWithProviders(<InboxListHeader />, { initialEntries: ['/inbox'] });

      expect(screen.getByTestId('inbox-list-selection-count')).toHaveTextContent('3 selected');
      expect(screen.getByTestId('inbox-bulk-actions-btn')).toBeInTheDocument();
    });

    it('sends a bulk mark-done request for the selected ids and clears the selection afterwards', async () => {
      let requestBody: unknown;
      server.use(
        http.patch('/api/inbox/bulk', async ({ request }) => {
          requestBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );
      useInboxStore.setState({ selectedIds: new Set([5, 6]) });

      const user = userEvent.setup();
      renderWithProviders(<InboxListHeader />, { initialEntries: ['/inbox'] });

      await user.click(screen.getByTestId('inbox-bulk-actions-btn'));
      await user.click(await screen.findByTestId('inbox-bulk-action-mark-done'));

      await waitFor(() => expect(requestBody).toEqual({ ids: [5, 6], isDone: true }));
      await waitFor(() => expect(useInboxStore.getState().selectedIds.size).toBe(0));
    });

    it('sends a bulk save request for the selected ids', async () => {
      let requestBody: unknown;
      server.use(
        http.patch('/api/inbox/bulk', async ({ request }) => {
          requestBody = await request.json();
          return new HttpResponse(null, { status: 204 });
        }),
      );
      useInboxStore.setState({ selectedIds: new Set([9]) });

      const user = userEvent.setup();
      renderWithProviders(<InboxListHeader />, { initialEntries: ['/inbox'] });

      await user.click(screen.getByTestId('inbox-bulk-actions-btn'));
      await user.click(await screen.findByTestId('inbox-bulk-action-save'));

      await waitFor(() => expect(requestBody).toEqual({ ids: [9], isSaved: true }));
    });
  });
});
