import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { ItemSource, SyncChangeKind } from '@api';
import { createQueryClient } from '@shared/api/queryClient';
import useSettingsStore from '@feature/settings/store/settings.store';
import useAlertStore, { AlertType } from '@shared/store/alert.store';
import { heartbeatKeys } from './useInboxHeartBeat';
import { inboxKeys } from './useInboxQuery';
import { useBackgroundSync } from './useBackgroundSync';

function makeWrapper() {
  const client = createQueryClient();
  return {
    client,
    Wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  };
}

function makeItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    integration: ItemSource.Github,
    title: 'Fix flaky integration test',
    changeKind: SyncChangeKind.New,
    externalId: '42',
    ...overrides,
  };
}

describe('useBackgroundSync', () => {
  let messageHandler: ((event: MessageEvent) => void) | undefined;
  let postMessageMock: ReturnType<typeof vi.fn>;
  let registerMock: ReturnType<typeof vi.fn>;
  let updateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    messageHandler = undefined;
    postMessageMock = vi.fn();
    updateMock = vi.fn().mockResolvedValue(undefined);
    registerMock = vi.fn().mockResolvedValue({ update: updateMock });

    vi.spyOn(navigator.serviceWorker, 'register').mockImplementation(
      registerMock as unknown as typeof navigator.serviceWorker.register,
    );
    vi.spyOn(navigator.serviceWorker, 'ready', 'get').mockResolvedValue({
      active: { postMessage: postMessageMock },
    } as unknown as ServiceWorkerRegistration);
    vi.spyOn(navigator.serviceWorker, 'addEventListener').mockImplementation(((
      _type: string,
      handler: EventListenerOrEventListenerObject,
    ) => {
      messageHandler = handler as (event: MessageEvent) => void;
    }) as typeof navigator.serviceWorker.addEventListener);
    vi.spyOn(navigator.serviceWorker, 'removeEventListener').mockImplementation(
      (() => {}) as unknown as typeof navigator.serviceWorker.removeEventListener,
    );

    useSettingsStore.setState({ syncIntervalMinutes: 5, sendNotifications: true });
    useAlertStore.setState({ alerts: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should register the service worker and force an update check on mount', async () => {
    const { Wrapper } = makeWrapper();
    renderHook(() => useBackgroundSync(), { wrapper: Wrapper });

    await waitFor(() => expect(registerMock).toHaveBeenCalledWith('/sw.js'));
    await waitFor(() => expect(updateMock).toHaveBeenCalled());
  });

  it('should post a sync tick on the configured interval with the current notification preference', async () => {
    vi.useFakeTimers();
    try {
      const { Wrapper } = makeWrapper();
      renderHook(() => useBackgroundSync(), { wrapper: Wrapper });

      // Let register()'s resolved promise (and its .then) settle before advancing the interval.
      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5 * 60_000);
      });

      expect(postMessageMock).toHaveBeenCalledWith({ type: 'SYNC_TICK', sendNotifications: true });
    } finally {
      vi.useRealTimers();
    }
  });

  it('should not post a sync tick before the configured interval elapses', async () => {
    vi.useFakeTimers();
    try {
      const { Wrapper } = makeWrapper();
      renderHook(() => useBackgroundSync(), { wrapper: Wrapper });

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(4 * 60_000);
      });

      expect(postMessageMock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('should invalidate inbox queries and add one alert per item when a SYNC_RESULT message arrives', async () => {
    const { client, Wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    renderHook(() => useBackgroundSync(), { wrapper: Wrapper });

    await waitFor(() => expect(messageHandler).toBeDefined());

    const items = [
      makeItem({ title: 'New PR', changeKind: SyncChangeKind.New }),
      makeItem({ title: 'Updated work item', changeKind: SyncChangeKind.Updated, integration: ItemSource.Ado }),
    ];

    act(() => {
      messageHandler!({ data: { type: 'SYNC_RESULT', items } } as MessageEvent);
    });

    await waitFor(() => expect(useAlertStore.getState().alerts).toHaveLength(2));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: inboxKeys.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: heartbeatKeys.status });

    const [newAlert, updatedAlert] = useAlertStore.getState().alerts;
    expect(newAlert.type).toBe(AlertType.SUCCESS);
    expect(newAlert.inboxItem).toMatchObject({ title: 'New PR', changeKind: SyncChangeKind.New });
    expect(updatedAlert.type).toBe(AlertType.INFO);
    expect(updatedAlert.inboxItem).toMatchObject({ title: 'Updated work item', changeKind: SyncChangeKind.Updated });
  });

  it('should cap individual item alerts and fold the remainder into a "+N more" summary alert', async () => {
    const { Wrapper } = makeWrapper();
    renderHook(() => useBackgroundSync(), { wrapper: Wrapper });

    await waitFor(() => expect(messageHandler).toBeDefined());

    const items = Array.from({ length: 6 }, (_, i) => makeItem({ title: `Item ${i}`, externalId: `${i}` }));

    act(() => {
      messageHandler!({ data: { type: 'SYNC_RESULT', items } } as MessageEvent);
    });

    // 4 individual item alerts (MAX_ITEM_ALERTS) + 1 "+2 more" rollup alert.
    await waitFor(() => expect(useAlertStore.getState().alerts).toHaveLength(5));
    const alerts = useAlertStore.getState().alerts;
    expect(alerts.slice(0, 4).every((alert) => alert.inboxItem)).toBe(true);
    expect(alerts[4].message).toBe('+2 more inbox updates');
    expect(alerts[4].inboxItem).toBeUndefined();
  });

  it('should ignore SYNC_RESULT messages with no items', async () => {
    const { Wrapper } = makeWrapper();
    renderHook(() => useBackgroundSync(), { wrapper: Wrapper });

    await waitFor(() => expect(messageHandler).toBeDefined());

    act(() => {
      messageHandler!({ data: { type: 'SYNC_RESULT', items: [] } } as MessageEvent);
    });

    expect(useAlertStore.getState().alerts).toHaveLength(0);
  });

  it('should ignore messages that are not SYNC_RESULT', async () => {
    const { Wrapper } = makeWrapper();
    renderHook(() => useBackgroundSync(), { wrapper: Wrapper });

    await waitFor(() => expect(messageHandler).toBeDefined());

    act(() => {
      messageHandler!({ data: { type: 'SOMETHING_ELSE' } } as MessageEvent);
    });

    expect(useAlertStore.getState().alerts).toHaveLength(0);
  });

  it('should stop posting sync ticks after unmount', async () => {
    vi.useFakeTimers();
    try {
      const { Wrapper } = makeWrapper();
      const { unmount } = renderHook(() => useBackgroundSync(), { wrapper: Wrapper });

      await act(async () => {
        await Promise.resolve();
      });

      unmount();
      postMessageMock.mockClear();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5 * 60_000);
      });

      expect(postMessageMock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
