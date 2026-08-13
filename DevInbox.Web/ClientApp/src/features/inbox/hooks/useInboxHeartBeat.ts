import { SyncStatus, type InboxStatus } from '@api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useInboxStore } from '../store/inbox.store';
import { inboxApi, inboxKeys } from './useInboxQuery';
import { ApiError } from '@shared/api/httpClient';
import useAlertStore, { AlertType } from '@shared/store/alert.store';

export const heartbeatKeys = {
  all: ['heartbeat'] as const,
  status: ['heartbeat', 'status'] as const,
} as const;

export const useInboxHeartbeat = () => {
  const queryClient = useQueryClient();
  const setStatus = useInboxStore((state) => state.setStatus);
  const status = useInboxStore((state) => state.status);
  const { addAlert } = useAlertStore();

  const query = useQuery<InboxStatus, ApiError>({
    queryKey: heartbeatKeys.status,
    queryFn: () => inboxApi.getInboxStatus(),
    refetchInterval: SyncStatus.Running == status?.syncStatus ? 5000 : 30000,
  });

  useEffect(() => {
    if (!query.data) {
      return;
    }

    const previousVersion = useInboxStore.getState().status?.version;

    const nextVersion = query.data.version;

    setStatus(query.data);

    const hasKnownPreviousVersion = previousVersion !== undefined && previousVersion !== null;

    const hasKnownNextVersion = nextVersion !== undefined && nextVersion !== null;

    const versionChanged =
      hasKnownPreviousVersion && hasKnownNextVersion && previousVersion !== nextVersion;

    if (versionChanged) {
      queryClient.invalidateQueries({
        queryKey: inboxKeys.items,
      });
      queryClient.invalidateQueries({
        queryKey: inboxKeys.summary,
      });
      addAlert({
        message: 'Updating inbox',
        type: AlertType.INFO,
      });
    }
  }, [query.data, queryClient, setStatus]);

  return query;
};
