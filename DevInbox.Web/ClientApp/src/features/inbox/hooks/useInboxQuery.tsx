import { InboxClient, InboxReason, ItemSource, ItemStatus, ItemType, SyncClient, type InboxPage } from '@api';
import { ApiError, apiFetch, BASE_URL } from '@shared/api/httpClient';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { heartbeatKeys } from './useInboxHeartBeat';
import type { InboxFilter } from '../utils/inboxFilter';

export const syncApi = new SyncClient(BASE_URL, { fetch: apiFetch });
export const inboxApi = new InboxClient(BASE_URL, { fetch: apiFetch });

/** Number of inbox items requested per page, both for the initial load and every subsequent infinite-scroll fetch. */
export const INBOX_PAGE_SIZE = 20;

export const inboxKeys = {
  all: ['inbox'] as const,
  items: ['inbox', 'items'] as const,
  detail: ['inbox', 'detail'] as const,
  summary: ['inbox', 'summary'] as const,
} as const;

/**
 * Infinite-scroll inbox query. Pages are fetched 20 items at a time and cached individually
 * by TanStack Query, so scrolling back up never re-fetches pages already in cache.
 * Consumers should flatten `data.pages[].items` for rendering (see `flattenInboxPages`).
 */
export const useInboxQuery = (filter?: InboxFilter) =>
  useInfiniteQuery({
    queryKey: [...inboxKeys.items, filter?.source, filter?.itemType, filter?.reason, filter?.status],
    queryFn: ({ pageParam }) =>
      inboxApi.listInboxItems(
        pageParam,
        INBOX_PAGE_SIZE,
        filter?.source as ItemSource | undefined,
        filter?.itemType as ItemType | undefined,
        filter?.status as ItemStatus | undefined,
        filter?.reason as InboxReason | undefined,
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const page = lastPage.page ?? 0;
      const size = lastPage.size ?? INBOX_PAGE_SIZE;
      const totalElements = lastPage.totalElements ?? 0;
      const loaded = (page + 1) * size;
      return loaded < totalElements ? page + 1 : undefined;
    },
  });

/** Flattens the pages of an infinite inbox query into a single item array for rendering. */
export const flattenInboxPages = (pages?: InboxPage[]) => pages?.flatMap((page) => page.items ?? []) ?? [];

export const useInboxSummaryQuery = () =>
  useQuery({
    queryKey: inboxKeys.summary,
    queryFn: () => inboxApi.getInboxSummary(),
  });

export const useInboxItemQuery = (itemId?: number) =>
  useQuery({
    queryKey: [...inboxKeys.detail, itemId],
    queryFn: () => inboxApi.getInboxItem(itemId!),
    enabled: !!itemId,
    meta: { silent: true },
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60_000, // 5 minutes
  });  

export const useSyncMutation = () =>
  {
    const queryClient = useQueryClient();
    return useMutation<void, ApiError, void>({
      mutationFn: () => syncApi.triggerSync(),
      onSuccess: () => {
        // Invalidate the inbox query to refetch the latest items after a successful sync.
        queryClient.invalidateQueries({ queryKey: inboxKeys.all });
        queryClient.invalidateQueries({ queryKey: heartbeatKeys.status });
      },
    });
  };

  /**
   * Seeds inbox with random items, useful for testing and development.
   * Do not invalidate queries after seeding, as the server will automatically trigger a sync and update the inbox.
   * @deprecated
   */
  export const useSeedMutation = () =>
  {
    return useMutation<void, ApiError, void>({
      mutationFn: () => inboxApi.putInboxSeed()
    });
  };

  export const useMarkInboxItemDoneMutation = () =>
  {
    const queryClient = useQueryClient();
    return useMutation<void, ApiError, { itemId: number; isDone: boolean }>({
      mutationFn: ({ itemId, isDone }) => inboxApi.markInboxItemDone(itemId, isDone),
      onSuccess: (_data, { itemId }) => {
        // Invalidate the inbox query to refetch the latest items after marking an item as done.
        queryClient.invalidateQueries({ queryKey: inboxKeys.items });
        queryClient.invalidateQueries({ queryKey: inboxKeys.summary });
        // The detail panel reads from its own cached query (staleTime: 30s) keyed by itemId —
        // without this it would keep showing the pre-mutation isDone until that staleTime elapses.
        queryClient.invalidateQueries({ queryKey: [...inboxKeys.detail, itemId] });
      },
    });
  };
    export const useSaveInboxItemMutation = () =>
  {
    const queryClient = useQueryClient();
    return useMutation<void, ApiError, { itemId: number; isSaved: boolean }>({
      mutationFn: ({ itemId, isSaved }) => inboxApi.saveInboxItem(itemId, isSaved),
      onSuccess: (_data, { itemId }) => {
        // Invalidate the inbox query to refetch the latest items after saving an item.
        queryClient.invalidateQueries({ queryKey: inboxKeys.items });
        queryClient.invalidateQueries({ queryKey: inboxKeys.summary });
        // The detail panel reads from its own cached query (staleTime: 30s) keyed by itemId —
        // without this it would keep showing the pre-mutation isSaved until that staleTime elapses.
        queryClient.invalidateQueries({ queryKey: [...inboxKeys.detail, itemId] });
      },
    });
  };
