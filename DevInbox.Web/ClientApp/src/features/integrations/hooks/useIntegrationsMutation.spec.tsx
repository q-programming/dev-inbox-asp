import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { http, HttpResponse } from 'msw';
import { server } from '@test/setupBrowserTests';
import { createQueryClient, queryClient } from '@shared/api/queryClient';
import { authKeys } from '@shared/hooks/useAuthQuery.ts';
import useUserStore, { AuthStatus } from '@shared/store/user.store';
import { AccountType, IntegrationStatus, IntegrationType } from '@api';
import { useConnectGithubPatMutation, useDisconnectGithubMutation } from './useIntegrationsMutation';

function makeWrapper() {
  const client = createQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const baseIdentity = {
  id: 1,
  email: 'jane@dev.com',
  accountType: AccountType.REGULAR,
  integrations: [{ type: IntegrationType.Ado, status: IntegrationStatus.INACTIVE }],
};

beforeEach(() => {
  useUserStore.setState({ status: AuthStatus.AUTHENTICATED, identity: { ...baseIdentity } });
  queryClient.setQueryData(authKeys.me, { ...baseIdentity });
});

describe('useConnectGithubPatMutation', () => {
  it('upserts the returned integration into the store, replacing any prior GitHub entry', async () => {
    useUserStore.setState({
      identity: {
        ...baseIdentity,
        integrations: [
          { type: IntegrationType.Github, status: IntegrationStatus.EXPIRED },
          { type: IntegrationType.Ado, status: IntegrationStatus.INACTIVE },
        ],
      },
    });
    server.use(
      http.post('/api/integrations/github/pat', () =>
        HttpResponse.json({ id: 5, status: IntegrationStatus.ACTIVE, type: IntegrationType.Github }),
      ),
    );

    const { result } = renderHook(() => useConnectGithubPatMutation(), { wrapper: makeWrapper() });
    result.current.mutate({ token: 'ghp_abc' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const integrations = useUserStore.getState().identity?.integrations ?? [];
    expect(integrations).toHaveLength(2);
    expect(integrations.find((entry) => entry.type === IntegrationType.Github)?.status).toBe(
      IntegrationStatus.ACTIVE,
    );
  });

  it('also updates the auth.me query cache so a later /me read reflects the new integration', async () => {
    server.use(
      http.post('/api/integrations/github/pat', () =>
        HttpResponse.json({ id: 5, status: IntegrationStatus.ACTIVE, type: IntegrationType.Github }),
      ),
    );

    const { result } = renderHook(() => useConnectGithubPatMutation(), { wrapper: makeWrapper() });
    result.current.mutate({ token: 'ghp_abc' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<{ integrations: { type: IntegrationType; status: IntegrationStatus }[] }>(
      authKeys.me,
    );
    expect(cached?.integrations?.find((entry) => entry.type === IntegrationType.Github)?.status).toBe(
      IntegrationStatus.ACTIVE,
    );
  });

  it('leaves the store unchanged when the PAT is rejected', async () => {
    server.use(http.post('/api/integrations/github/pat', () => HttpResponse.json({}, { status: 400 })));

    const { result } = renderHook(() => useConnectGithubPatMutation(), { wrapper: makeWrapper() });
    result.current.mutate({ token: 'ghp_bad' });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const integrations = useUserStore.getState().identity?.integrations ?? [];
    expect(integrations.find((entry) => entry.type === IntegrationType.Github)).toBeUndefined();
  });

  it('does nothing when there is no identity in the store', async () => {
    useUserStore.setState({ identity: null });
    server.use(
      http.post('/api/integrations/github/pat', () =>
        HttpResponse.json({ id: 5, status: IntegrationStatus.ACTIVE, type: IntegrationType.Github }),
      ),
    );

    const { result } = renderHook(() => useConnectGithubPatMutation(), { wrapper: makeWrapper() });
    result.current.mutate({ token: 'ghp_abc' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useUserStore.getState().identity).toBeNull();
  });
});

describe('useDisconnectGithubMutation', () => {
  it('removes the GitHub integration from the store on success', async () => {
    useUserStore.setState({
      identity: {
        ...baseIdentity,
        integrations: [
          { type: IntegrationType.Github, status: IntegrationStatus.ACTIVE },
          { type: IntegrationType.Ado, status: IntegrationStatus.INACTIVE },
        ],
      },
    });
    server.use(http.delete('/api/integrations/github', () => new HttpResponse(null, { status: 204 })));

    const { result } = renderHook(() => useDisconnectGithubMutation(), { wrapper: makeWrapper() });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const integrations = useUserStore.getState().identity?.integrations ?? [];
    expect(integrations.find((entry) => entry.type === IntegrationType.Github)).toBeUndefined();
    expect(integrations).toHaveLength(1);
  });

  it('leaves the GitHub integration in the store when disconnect fails', async () => {
    useUserStore.setState({
      identity: {
        ...baseIdentity,
        integrations: [{ type: IntegrationType.Github, status: IntegrationStatus.ACTIVE }],
      },
    });
    server.use(http.delete('/api/integrations/github', () => HttpResponse.json({}, { status: 500 })));

    const { result } = renderHook(() => useDisconnectGithubMutation(), { wrapper: makeWrapper() });
    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));

    const integrations = useUserStore.getState().identity?.integrations ?? [];
    expect(integrations.find((entry) => entry.type === IntegrationType.Github)?.status).toBe(
      IntegrationStatus.ACTIVE,
    );
  });
});
