import { ConnectPatRequest, IntegrationDto, IntegrationsClient, IntegrationType } from '@api';
import { inboxKeys } from '@feature/inbox/hooks/useInboxQuery';
import { ApiError, apiFetch, BASE_URL } from '@shared/api/httpClient';
import { authKeys } from '@shared/hooks/useAuthQuery.ts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const integrationsApi = new IntegrationsClient(BASE_URL, { fetch: apiFetch });

/**
 * Connects GitHub, or a single Azure DevOps organization, via a Personal Access Token.
 * ADO PATs are organization-scoped (Microsoft is deprecating "all accessible organizations" PATs),
 * so `body.organization` is required for ADO — calling this again for an already-connected
 * organization reconnects/replaces its PAT rather than adding a duplicate entry.
 */
export const useConnectIntegrationPatMutation = (integration: IntegrationType) => {
  const queryClient = useQueryClient();
  return useMutation<IntegrationDto, ApiError, ConnectPatRequest>({
    mutationFn: (body) => {
      if (IntegrationType.Github === integration) {
        return integrationsApi.connectGithubPat(body);
      }
      else if (IntegrationType.Ado === integration) {
        return integrationsApi.connectAdoPat(body);
      }
      throw Error('Unsupported integration');
    },
    onSuccess: () => {
      // purge the /me and inbox queries so the new integration is reflected in the UI
      queryClient.invalidateQueries({ queryKey: authKeys.me });
      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
    },
    meta: {
      errorMessage: (error: Error) =>
        error instanceof ApiError && error.status === 400
          ? 'Could not validate that token — please check it (and the organization name) and try again.'
          : 'Failed to connect . Please try again.',
    },
  });
};

/** Disconnects GitHub for the current user. */
export const useDisconnectIntegrationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, void>({
    mutationFn: () => integrationsApi.disconnectGithub(),
    onSuccess: () => {
      // purge the /me and inbox queries so the disconnected integration is reflected in the UI
      queryClient.invalidateQueries({ queryKey: authKeys.me });
      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
    },
    meta: { errorMessage: () => 'Failed to disconnect. Please try again.' },
  });
};

/**
 * Disconnects a single Azure DevOps organization for the current user — removes its PAT and every
 * inbox item previously synced from it, leaving other connected organizations untouched.
 */
export const useDisconnectAdoOrganizationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (organization) => integrationsApi.disconnectAdo(organization),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.me });
      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
    },
    meta: { errorMessage: () => 'Failed to disconnect. Please try again.' },
  });
};

