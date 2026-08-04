import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { InboxReason, ItemSource, ItemType, type InboxItemSummary } from '@api';
import { renderWithProviders } from '@test/renderWithProviders';
import { server } from '@test/setupBrowserTests';
import InboxList from './InboxList';

const createInboxItem = (overrides: Partial<InboxItemSummary> = {}): InboxItemSummary => ({
  id: 1,
  sourceType: ItemSource.Github,
  itemType: ItemType.PR,
  title: 'Review PR',
  repository: 'octo/repo',
  reason: InboxReason.ReviewRequested,
  isUnread: true,
  isSaved: false,
  isDone: false,
  isPinned: false,
  activityAt: new Date('2026-08-01T08:00:00.000Z'),
  createdAt: new Date('2026-08-01T07:00:00.000Z'),
  updatedAt: new Date('2026-08-01T08:00:00.000Z'),
  ...overrides,
});

describe('InboxList', () => {
  it('should render the loading state while the inbox query is pending', async () => {
    server.use(
      http.get('/api/inbox', async () => {
        await delay(250);
        return HttpResponse.json({ items: [], totalElements: 0, page: 0, size: 20 });
      }),
    );

    renderWithProviders(<InboxList />, { initialEntries: ['/inbox'] });

    expect(screen.getByTestId('inbox-list-loading')).toBeInTheDocument();
    expect(await screen.findByTestId('inbox-list')).toBeInTheDocument();
  });

  it('should render one inbox item row per returned item', async () => {
    const items = [
      createInboxItem({ id: 1, title: 'Review PR' }),
      createInboxItem({ id: 2, title: 'Investigate alert', itemType: ItemType.Issue }),
      createInboxItem({ id: 3, title: 'Plan next steps', sourceType: ItemSource.Note, itemType: ItemType.Note }),
    ];

    server.use(
      http.get('/api/inbox', () =>
        HttpResponse.json({ items, totalElements: items.length, page: 0, size: 20 }),
      ),
    );

    renderWithProviders(<InboxList />, { initialEntries: ['/inbox'] });

    expect(await screen.findByTestId('inbox-list')).toBeInTheDocument();
    expect(screen.getByText('Review PR')).toBeInTheDocument();
    expect(screen.getByText('Investigate alert')).toBeInTheDocument();
    expect(screen.getByText('Plan next steps')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('should render an empty list when the API returns no items', async () => {
    server.use(
      http.get('/api/inbox', () =>
        HttpResponse.json({ items: [], totalElements: 0, page: 0, size: 20 }),
      ),
    );

    renderWithProviders(<InboxList />, { initialEntries: ['/inbox'] });

    const list = await screen.findByTestId('inbox-list');
    expect(list).toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('should request inbox items using filters parsed from the URL', async () => {
    server.use(
      http.get('/api/inbox', ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('source')).toBe('Github');

        return HttpResponse.json({ items: [], totalElements: 0, page: 0, size: 20 });
      }),
    );

    renderWithProviders(<InboxList />, { initialEntries: ['/inbox?source=Github'] });

    await waitFor(() => expect(screen.getByTestId('inbox-list')).toBeInTheDocument());
  });
});
