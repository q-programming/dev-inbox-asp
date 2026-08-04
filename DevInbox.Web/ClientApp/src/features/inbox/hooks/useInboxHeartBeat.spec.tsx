import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { http, HttpResponse } from 'msw';

import { type InboxStatus, SyncStatus } from '@api';
import { createQueryClient } from '@shared/api/queryClient';
import { server } from '@test/setupBrowserTests';
import { INBOX_STORAGE_KEY, useInboxStore } from '../store/inbox.store';
import { inboxKeys } from './useInboxQuery';
import { useInboxHeartbeat } from './useInboxHeartBeat';

const STATUS_PATH = '/api/inbox/status';

function makeStatus(overrides: Partial<InboxStatus> = {}): InboxStatus {
  return {
    syncStatus: SyncStatus.Idle,
    version: 1,
    ...overrides,
  };
}

function makeWrapper() {
  const client = createQueryClient();
  client.setDefaultOptions({
    queries: {
      retry: false,
      staleTime: 30_000,
    },
  });

  return {
    client,
    Wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  };
}

describe('useInboxHeartbeat', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.removeItem(INBOX_STORAGE_KEY);
    useInboxStore.setState({
      status: undefined,
      selectedItemId: undefined,
    });
  });

  it('should update the inbox store status when the heartbeat succeeds', async () => {
    const response = makeStatus({ version: 7, syncStatus: SyncStatus.Running });
    server.use(http.get(STATUS_PATH, () => HttpResponse.json(response)));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useInboxHeartbeat(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useInboxStore.getState().status).toMatchObject(response);
  });

  it('should invalidate inbox item queries when the version changes', async () => {
    useInboxStore.setState({
      status: makeStatus({ version: 1 }),
      selectedItemId: undefined,
    });
    server.use(http.get(STATUS_PATH, () => HttpResponse.json(makeStatus({ version: 2 }))));

    const { client, Wrapper } = makeWrapper();
    client.setQueryData(inboxKeys.items, { items: [{ id: 1 }] });

    renderHook(() => useInboxHeartbeat(), { wrapper: Wrapper });

    await waitFor(() =>
      expect(client.getQueryState(inboxKeys.items)?.isInvalidated).toBe(true),
    );
  });

  it('should not invalidate inbox item queries when the version is unchanged', async () => {
    useInboxStore.setState({
      status: makeStatus({ version: 2 }),
      selectedItemId: undefined,
    });
    server.use(http.get(STATUS_PATH, () => HttpResponse.json(makeStatus({ version: 2 }))));

    const { client, Wrapper } = makeWrapper();
    client.setQueryData(inboxKeys.items, { items: [{ id: 1 }] });

    renderHook(() => useInboxHeartbeat(), { wrapper: Wrapper });

    await waitFor(() => expect(useInboxStore.getState().status?.version).toBe(2));
    expect(client.getQueryState(inboxKeys.items)?.isInvalidated).not.toBe(true);
  });

  it('should not invalidate inbox item queries when the previous version is unknown', async () => {
    server.use(http.get(STATUS_PATH, () => HttpResponse.json(makeStatus({ version: 3 }))));

    const { client, Wrapper } = makeWrapper();
    client.setQueryData(inboxKeys.items, { items: [{ id: 1 }] });

    renderHook(() => useInboxHeartbeat(), { wrapper: Wrapper });

    await waitFor(() => expect(useInboxStore.getState().status?.version).toBe(3));
    expect(client.getQueryState(inboxKeys.items)?.isInvalidated).not.toBe(true);
  });

  it('should expose an error state when the heartbeat request fails', async () => {
    server.use(http.get(STATUS_PATH, () => HttpResponse.json({}, { status: 500 })));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useInboxHeartbeat(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useInboxStore.getState().status).toBeUndefined();
  });
});
