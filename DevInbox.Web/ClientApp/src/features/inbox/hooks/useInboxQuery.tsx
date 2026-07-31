import { InboxClient, SyncClient } from '@api';
import { ApiError, apiFetch, BASE_URL } from '@shared/api/httpClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { heartbeatKeys } from './useInboxHeartBeat';

export const syncApi = new SyncClient(BASE_URL, { fetch: apiFetch });
export const inboxApi = new InboxClient(BASE_URL, { fetch: apiFetch });

export const inboxKeys = {
  all: ['inbox'] as const,
  items: ['inbox', 'items'] as const,
} as const;

export const useInboxQuery = () =>
  useQuery({
    queryKey: inboxKeys.items,
    queryFn: () => inboxApi.listInboxItems(undefined, undefined, undefined, undefined, undefined),
  });

export const useSyncMutation = () =>
  {
    const queryClient = useQueryClient();
    return useMutation<void, ApiError, void>({
      mutationFn: () => syncApi.triggerSync(),
      onSuccess: () => {
        // Invalidate the inbox query to refetch the latest items after a successful sync.
        queryClient.invalidateQueries({ queryKey: inboxKeys.items });
        queryClient.invalidateQueries({ queryKey: heartbeatKeys.status });
      },
    });
  };
