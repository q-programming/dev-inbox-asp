import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { http, HttpResponse } from 'msw';
import { server } from '@test/setupBrowserTests';
import { createQueryClient } from '@shared/api/queryClient';
import { authKeys } from '@shared/hooks/useAuthQuery.ts';
import { inboxKeys } from '@feature/inbox/hooks/useInboxQuery';
import { IntegrationStatus, IntegrationType } from '@api';
import {
  useConnectIntegrationPatMutation,
  useDisconnectAdoOrganizationMutation,
  useDisconnectIntegrationMutation,
} from './useIntegrationsMutation';

function makeWrapper() {
  const client = createQueryClient();
  return {
    client,
    Wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('useConnectIntegrationPatMutation', () => {
  it.each([
    {
      integration: IntegrationType.Github,
      path: '/api/integrations/github/pat',
      otherPath: '/api/integrations/ado/pat',
    },
    {
      integration: IntegrationType.Ado,
      path: '/api/integrations/ado/pat',
      otherPath: '/api/integrations/github/pat',
    },
  ])(
    'should post to $path and invalidate auth + inbox queries for $integration',
    async ({ integration, path, otherPath }) => {
      let matchedCalls = 0;
      let otherCalls = 0;

      server.use(
        http.post(path, () => {
          matchedCalls += 1;
          return HttpResponse.json({ id: 5, status: IntegrationStatus.ACTIVE, type: integration });
        }),
        http.post(otherPath, () => {
          otherCalls += 1;
          return HttpResponse.json({ id: 99, status: IntegrationStatus.ACTIVE, type: integration });
        }),
      );

      const { client, Wrapper } = makeWrapper();
      const invalidateQueriesSpy = vi.spyOn(client, 'invalidateQueries');
      const { result } = renderHook(() => useConnectIntegrationPatMutation(integration), {
        wrapper: Wrapper,
      });

      result.current.mutate({ token: 'token-value' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(matchedCalls).toBe(1);
      expect(otherCalls).toBe(0);
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: authKeys.me });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: inboxKeys.all });
    },
  );

  it('should not invalidate any queries when the PAT is rejected', async () => {
    server.use(http.post('/api/integrations/github/pat', () => HttpResponse.json({}, { status: 400 })));

    const { client, Wrapper } = makeWrapper();
    const invalidateQueriesSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useConnectIntegrationPatMutation(IntegrationType.Github), {
      wrapper: Wrapper,
    });

    result.current.mutate({ token: 'ghp_bad' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});

describe('useDisconnectIntegrationMutation (GitHub)', () => {
  it('should delete /api/integrations/github and invalidate auth + inbox queries', async () => {
    let matchedCalls = 0;
    server.use(
      http.delete('/api/integrations/github', () => {
        matchedCalls += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { client, Wrapper } = makeWrapper();
    const invalidateQueriesSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useDisconnectIntegrationMutation(), {
      wrapper: Wrapper,
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(matchedCalls).toBe(1);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: authKeys.me });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: inboxKeys.all });
  });

  it('should not invalidate any queries when disconnect fails', async () => {
    server.use(http.delete('/api/integrations/github', () => HttpResponse.json({}, { status: 500 })));

    const { client, Wrapper } = makeWrapper();
    const invalidateQueriesSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useDisconnectIntegrationMutation(), {
      wrapper: Wrapper,
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});

describe('useDisconnectAdoOrganizationMutation', () => {
  it('should delete /api/integrations/ado/{organization} and invalidate auth + inbox queries', async () => {
    let requestedOrganization: string | undefined;
    server.use(
      http.delete('/api/integrations/ado/:organization', ({ params }) => {
        requestedOrganization = params.organization as string;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { client, Wrapper } = makeWrapper();
    const invalidateQueriesSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useDisconnectAdoOrganizationMutation(), {
      wrapper: Wrapper,
    });

    result.current.mutate('contoso');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requestedOrganization).toBe('contoso');
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: authKeys.me });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: inboxKeys.all });
  });

  it('should not invalidate any queries when disconnect fails', async () => {
    server.use(http.delete('/api/integrations/ado/:organization', () => HttpResponse.json({}, { status: 500 })));

    const { client, Wrapper } = makeWrapper();
    const invalidateQueriesSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useDisconnectAdoOrganizationMutation(), {
      wrapper: Wrapper,
    });

    result.current.mutate('contoso');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});
