import { InboxClient, SyncClient } from '@api';
import { ApiError, apiFetch, BASE_URL } from '@shared/api/httpClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { heartbeatKeys } from './useInboxHeartBeat';

export const syncApi = new SyncClient(BASE_URL, { fetch: apiFetch });
export const inboxApi = new InboxClient(BASE_URL, { fetch: apiFetch });

export const inboxKeys = {
  all: ['inbox'] as const,
  items: ['inbox', 'items'] as const,
  detail: ['inbox', 'detail'] as const,
  summary: ['inbox', 'summary'] as const,
} as const;

export const useInboxQuery = () =>
  useQuery({
    queryKey: inboxKeys.items,
    queryFn: () => inboxApi.listInboxItems(0, 20, undefined, undefined, undefined),
  });

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
        queryClient.invalidateQueries({ queryKey: inboxKeys.items });
        queryClient.invalidateQueries({ queryKey: inboxKeys.summary });
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
