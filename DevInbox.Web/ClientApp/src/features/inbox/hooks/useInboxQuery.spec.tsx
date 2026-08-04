import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { http, HttpResponse } from 'msw';
import {
  InboxReason,
  ItemSource,
  ItemType,
  SyncStatus,
  type InboxItemDetail,
  type InboxItemSummary,
  type InboxStatus,
  type InboxSummary,
} from '@api';
import { createQueryClient } from '@shared/api/queryClient';
import { server } from '@test/setupBrowserTests';
import type { InboxFilter } from '../utils/inboxFilter';
import { heartbeatKeys } from './useInboxHeartBeat';
import {
  inboxKeys,
  useInboxItemQuery,
  useInboxQuery,
  useInboxSummaryQuery,
  useSyncMutation,
} from './useInboxQuery';

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

const createInboxItemDetail = (overrides: Partial<InboxItemDetail> = {}): InboxItemDetail => ({
  id: 42,
  title: 'Detailed inbox item',
  ...overrides,
});

const summary: InboxSummary = {
  total: 2,
  unread: 1,
  reviewRequests: 1,
};

const heartbeat: InboxStatus = {
  version: 7,
  syncStatus: SyncStatus.Completed,
  lastUpdatedAt: new Date('2026-08-01T08:00:00.000Z'),
  lastSyncCompletedAt: new Date('2026-08-01T08:05:00.000Z'),
};

function makeWrapper() {
  const client = createQueryClient();
  client.setDefaultOptions({
    queries: {
      retry: false,
      staleTime: 30_000,
    },
  });
  return {
    client,
    Wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  };
}

describe('useInboxQuery hooks', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('useInboxQuery', () => {
    it('should return inbox items on success', async () => {
      const items = [createInboxItem(), createInboxItem({ id: 2, title: 'Follow up issue' })];
      server.use(
        http.get('/api/inbox', () =>
          HttpResponse.json({ items, totalElements: items.length, page: 0, size: 20 }),
        ),
      );

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useInboxQuery(), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.items).toHaveLength(2);
      expect(result.current.data?.items?.map((item) => item.title)).toEqual([
        'Review PR',
        'Follow up issue',
      ]);
    });

    it('should use filter values in the query key so cache entries stay distinct', async () => {
      const { client, Wrapper } = makeWrapper();
      const githubFilter: InboxFilter = { source: ItemSource.Github };
      const adoFilter: InboxFilter = { source: ItemSource.Ado, reason: InboxReason.Assigned };

      server.use(
        http.get('/api/inbox', ({ request }) => {
          const url = new URL(request.url);
          const source = url.searchParams.get('source');

          return HttpResponse.json({
            items: [createInboxItem({ id: source === ItemSource.Github ? 1 : 2, sourceType: source as ItemSource })],
            totalElements: 1,
            page: 0,
            size: 20,
          });
        }),
      );

      const first = renderHook(({ filter }) => useInboxQuery(filter), {
        wrapper: Wrapper,
        initialProps: { filter: githubFilter },
      });
      await waitFor(() => expect(first.result.current.isSuccess).toBe(true));

      const second = renderHook(({ filter }) => useInboxQuery(filter), {
        wrapper: Wrapper,
        initialProps: { filter: adoFilter },
      });
      await waitFor(() => expect(second.result.current.isSuccess).toBe(true));

      const githubKey = [...inboxKeys.items, githubFilter.source, undefined, undefined] as const;
      const adoKey = [...inboxKeys.items, adoFilter.source, undefined, adoFilter.reason] as const;

      expect(client.getQueryData(githubKey)).toBeDefined();
      expect(client.getQueryData(adoKey)).toBeDefined();
      expect(client.getQueryState(githubKey)).not.toBe(client.getQueryState(adoKey));
    });

    it('should set isError when the server returns 500', async () => {
      server.use(http.get('/api/inbox', () => HttpResponse.json({}, { status: 500 })));

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useInboxQuery(), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useInboxSummaryQuery', () => {
    it('should return inbox summary on success', async () => {
      server.use(http.get('/api/inbox/summary', () => HttpResponse.json(summary)));

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useInboxSummaryQuery(), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toMatchObject(summary);
    });

    it('should set isError when summary request fails', async () => {
      server.use(http.get('/api/inbox/summary', () => HttpResponse.json({}, { status: 500 })));

      const { Wrapper } = makeWrapper();
      const { result } = renderHook(() => useInboxSummaryQuery(), { wrapper: Wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useInboxItemQuery', () => {
    it('should not fetch until an item id is provided', async () => {
      let requestCount = 0;
      server.use(
        http.get('/api/inbox/item/:id', ({ params }) => {
          requestCount += 1;
          return HttpResponse.json(createInboxItemDetail({ id: Number(params.id) }));
        }),
      );

      const { Wrapper } = makeWrapper();
      const { result, rerender } = renderHook(({ itemId }) => useInboxItemQuery(itemId), {
        wrapper: Wrapper,
        initialProps: { itemId: undefined as number | undefined },
      });

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(requestCount).toBe(0);

      rerender({ itemId: 42 });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(requestCount).toBe(1);
      expect(result.current.data?.id).toBe(42);
    });
  });

  describe('useSyncMutation', () => {
    it('should invalidate inbox, summary and heartbeat queries after a successful sync', async () => {
      server.use(
        http.post('/api/sync/trigger', () => new HttpResponse(null, { status: 202 })),
        http.get('/api/inbox/status', () => HttpResponse.json(heartbeat)),
      );

      const { client, Wrapper } = makeWrapper();
      const invalidateQueriesSpy = vi.spyOn(client, 'invalidateQueries');
      const { result } = renderHook(() => useSyncMutation(), { wrapper: Wrapper });

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: inboxKeys.items });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: inboxKeys.summary });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: heartbeatKeys.status });
    });
  });

  describe('inboxKeys', () => {
    it('should expose the expected key structure', () => {
      expect(inboxKeys.all).toEqual(['inbox']);
      expect(inboxKeys.items).toEqual(['inbox', 'items']);
      expect(inboxKeys.detail).toEqual(['inbox', 'detail']);
      expect(inboxKeys.summary).toEqual(['inbox', 'summary']);
    });
  });
});
