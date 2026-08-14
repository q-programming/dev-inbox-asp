import { ConnectGithubPatRequest, IntegrationDto, IntegrationsClient } from '@api';
import { inboxKeys } from '@feature/inbox/hooks/useInboxQuery';
import { ApiError, apiFetch, BASE_URL } from '@shared/api/httpClient';
import { authKeys } from '@shared/hooks/useAuthQuery.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const integrationsApi = new IntegrationsClient(BASE_URL, { fetch: apiFetch });

/** Connects GitHub via a Personal Access Token. */
export const useConnectGithubPatMutation = () =>
  {
    const queryClient = useQueryClient();
    return useMutation<IntegrationDto, ApiError, ConnectGithubPatRequest>({
      mutationFn: (body) => integrationsApi.connectGithubPat(body),
      onSuccess: () => {
        // purge the /me and inbox queries so the new integration is reflected in the UI
        queryClient.invalidateQueries({ queryKey: authKeys.me });
        queryClient.invalidateQueries({ queryKey: inboxKeys.all });
      },
      meta: {
        errorMessage: (error: Error) => error instanceof ApiError && error.status === 400
          ? 'Could not validate that token — please check it and try again.'
          : 'Failed to connect GitHub. Please try again.',
      },
    });
  };

/** Disconnects the GitHub integration for the current user. */
export const useDisconnectGithubMutation = () =>
  {
    const queryClient = useQueryClient();
    return useMutation<void, ApiError, void>({
      mutationFn: () => integrationsApi.disconnectGithub(),
      onSuccess: () => {
        // purge the /me and inbox queries so the disconnected integration is reflected in the UI
        queryClient.invalidateQueries({ queryKey: authKeys.me });
        queryClient.invalidateQueries({ queryKey: inboxKeys.all });
      },
      meta: { errorMessage: () => 'Failed to disconnect GitHub. Please try again.' },
    });
  };
