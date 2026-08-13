import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';

import { ItemSource, ItemType, type InboxItemDetail } from '@api';
import { useInboxStore } from '@feature/inbox/store/inbox.store';
import { renderWithProviders } from '@test/renderWithProviders';
import { server } from '@test/setupBrowserTests';
import InboxDetailPanel from './InboxDetailPanel';

const ITEM_PATH = '/api/inbox/item/:id';

function makeDetail(overrides: Partial<InboxItemDetail> = {}): InboxItemDetail {
  return {
    id: 1,
    title: 'Inbox detail title',
    itemType: ItemType.Note,
    source: ItemSource.Note,
    isDone: false,
    isSaved: false,
    isClosed: false,
    note: {},
    ...overrides,
  };
}

describe('InboxDetailPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    useInboxStore.setState({
      status: undefined,
      selectedItemId: undefined,
    });
  });

  it('should render nothing when no item is selected', () => {
    const { container } = renderWithProviders(<InboxDetailPanel />);

    expect(container).toBeEmptyDOMElement();
  });

  it('should show a loading indicator while the item detail query is loading', async () => {
    useInboxStore.setState({ selectedItemId: 101 });

    server.use(
      http.get(ITEM_PATH, async () => {
        await delay(200);
        return HttpResponse.json(makeDetail());
      }),
    );

    renderWithProviders(<InboxDetailPanel />);

    expect(screen.getByTestId('inbox-detail-panel-loading')).toBeInTheDocument();
    expect(await screen.findByTestId('note-detail')).toBeInTheDocument();
  });

  it.each([
    [ItemSource.Ado, 'ado-detail'],
    [ItemSource.Github, 'github-detail'],
    [ItemSource.Note, 'note-detail'],
  ])('should render the correct detail component for %s', async (source, expectedTestId) => {
    useInboxStore.setState({ selectedItemId: 202 });

    const detail =
      source === ItemSource.Ado
        ? makeDetail({
            source,
            itemType: ItemType.WorkItem,
            ado: { workItemId: '5', title: 'ADO work item', url: 'https://ado.example/items/5' },
            note: undefined,
          })
        : source === ItemSource.Github
          ? makeDetail({
              source,
              itemType: ItemType.PR,
              github: {
                repository: 'org/repo',
                title: 'PR title',
                url: 'https://github.com/org/repo/pull/1',
              },
              note: undefined,
            })
          : makeDetail({ source, itemType: ItemType.Note, note: {} });

    server.use(http.get(ITEM_PATH, () => HttpResponse.json(detail)));

    renderWithProviders(<InboxDetailPanel />);

    expect(await screen.findByTestId(expectedTestId)).toBeInTheDocument();
  });

  it('should render no extra detail content when the source is missing', async () => {
    useInboxStore.setState({ selectedItemId: 303 });
    server.use(http.get(ITEM_PATH, () => HttpResponse.json(makeDetail({ source: undefined }))));

    renderWithProviders(<InboxDetailPanel />);

    await waitFor(() =>
      expect(screen.queryByTestId('inbox-detail-panel-loading')).not.toBeInTheDocument(),
    );
    expect(screen.queryByTestId('ado-detail')).not.toBeInTheDocument();
    expect(screen.queryByTestId('note-detail')).not.toBeInTheDocument();
    expect(screen.queryByTestId('github-detail')).not.toBeInTheDocument();
  });

  it('should render no extra detail content when the source is unrecognized', async () => {
    useInboxStore.setState({ selectedItemId: 404 });
    server.use(
      http.get(ITEM_PATH, () =>
        HttpResponse.json(makeDetail({ source: 'Other' as ItemSource, note: undefined })),
      ),
    );

    renderWithProviders(<InboxDetailPanel />);

    await waitFor(() =>
      expect(screen.queryByTestId('inbox-detail-panel-loading')).not.toBeInTheDocument(),
    );
    expect(screen.queryByTestId('ado-detail')).not.toBeInTheDocument();
    expect(screen.queryByTestId('note-detail')).not.toBeInTheDocument();
    expect(screen.queryByTestId('github-detail')).not.toBeInTheDocument();
  });
});
