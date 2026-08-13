import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { http, HttpResponse } from 'msw';
import { server } from '@test/setupBrowserTests';
import { createQueryClient } from '@shared/api/queryClient';
import { authKeys } from '@shared/hooks/useAuthQuery.ts';
import { inboxKeys } from '@feature/inbox/hooks/useInboxQuery';
import { IntegrationStatus, IntegrationType } from '@api';
import { useConnectGithubPatMutation, useDisconnectGithubMutation } from './useIntegrationsMutation';

function makeWrapper() {
  const client = createQueryClient();
  return {
    client,
    Wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  };
}

// Store/UI sync (badge, identity.integrations) happens via useAuthBootstrap's /me
// refetch — mounted only in AuthGuard — once authKeys.me is invalidated below.
// These hook tests verify only what the mutation itself owns: the request and
// the cache invalidation it triggers.
describe('useConnectGithubPatMutation', () => {
  it('invalidates the auth.me and inbox queries after a successful connect', async () => {
    server.use(
      http.post('/api/integrations/github/pat', () =>
        HttpResponse.json({ id: 5, status: IntegrationStatus.ACTIVE, type: IntegrationType.Github }),
      ),
    );

    const { client, Wrapper } = makeWrapper();
    const invalidateQueriesSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useConnectGithubPatMutation(), { wrapper: Wrapper });

    result.current.mutate({ token: 'ghp_abc' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: authKeys.me });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: inboxKeys.all });
  });

  it('does not invalidate any queries when the PAT is rejected', async () => {
    server.use(http.post('/api/integrations/github/pat', () => HttpResponse.json({}, { status: 400 })));

    const { client, Wrapper } = makeWrapper();
    const invalidateQueriesSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useConnectGithubPatMutation(), { wrapper: Wrapper });

    result.current.mutate({ token: 'ghp_bad' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});

describe('useDisconnectGithubMutation', () => {
  it('invalidates the auth.me and inbox queries after a successful disconnect', async () => {
    server.use(http.delete('/api/integrations/github', () => new HttpResponse(null, { status: 204 })));

    const { client, Wrapper } = makeWrapper();
    const invalidateQueriesSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useDisconnectGithubMutation(), { wrapper: Wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: authKeys.me });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: inboxKeys.all });
  });

  it('does not invalidate any queries when disconnect fails', async () => {
    server.use(http.delete('/api/integrations/github', () => HttpResponse.json({}, { status: 500 })));

    const { client, Wrapper } = makeWrapper();
    const invalidateQueriesSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useDisconnectGithubMutation(), { wrapper: Wrapper });

    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});
