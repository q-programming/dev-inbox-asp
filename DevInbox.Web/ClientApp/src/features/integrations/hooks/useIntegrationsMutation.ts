import { ConnectPatRequest, IntegrationDto, IntegrationsClient, IntegrationType, AdoOrganizationDto } from '@api';
import { inboxKeys } from '@feature/inbox/hooks/useInboxQuery';
import { ApiError, apiFetch, BASE_URL } from '@shared/api/httpClient';
import { authKeys } from '@shared/hooks/useAuthQuery.ts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const integrationsApi = new IntegrationsClient(BASE_URL, { fetch: apiFetch });

export const adoOrganizationsKeys = {
  all: ['integrations', 'ado', 'organizations'] as const,
};


/** Connects GitHub via a Personal Access Token. */
export const useConnectIntegrationPatMutation = (integration: IntegrationType) => {
  const queryClient = useQueryClient();
  return useMutation<IntegrationDto, ApiError, ConnectPatRequest>({
    mutationFn: (body) => {
      if (IntegrationType.Github === integration) {
        return integrationsApi.connectGithubPat(body);
      }
      else if (IntegrationType.Ado) {
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
          ? 'Could not validate that token — please check it and try again.'
          : 'Failed to connect . Please try again.',
    },
  });
};

/** Lists the Azure DevOps organizations currently usable by the connected PAT (auto-discovered and/or manually added). */
export const useAdoOrganizationsQuery = (enabled: boolean) =>
  useQuery<AdoOrganizationDto[], ApiError>({
    queryKey: adoOrganizationsKeys.all,
    queryFn: () => integrationsApi.getAdoOrganizations(),
    enabled,
  });

/** Manually adds an Azure DevOps organization, validated server-side against the connected PAT. */
export const useAddAdoOrganizationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<AdoOrganizationDto[], ApiError, string>({
    mutationFn: (organizationName) => integrationsApi.addAdoOrganization({ organizationName }),
    onSuccess: (organizations) => {
      queryClient.setQueryData(adoOrganizationsKeys.all, organizations);
      // A newly-added organization is only picked up by the next sync's project discovery.
      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
    },
    meta: {
      errorMessage: (error: Error) =>
        error instanceof ApiError && error.status === 400
          ? 'Could not access that organization with the connected token — please check the name and try again.'
          : 'Failed to add organization. Please try again.',
    },
  });
};

/** Disconnects integration for the current user. */
export const useDisconnectIntegrationMutation = (integration: IntegrationType) => {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, void>({
    mutationFn: () => {
      if(IntegrationType.Github === integration){
        return integrationsApi.disconnectGithub();
      }
      if(IntegrationType.Ado === integration){
        return integrationsApi.disconnectAdo();
      }
      throw Error('Unsupported integration');
    },
    onSuccess: () => {
      // purge the /me and inbox queries so the disconnected integration is reflected in the UI
      queryClient.invalidateQueries({ queryKey: authKeys.me });
      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
    },
    meta: { errorMessage: () => 'Failed to disconnect. Please try again.' },
  });
};
