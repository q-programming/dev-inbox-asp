import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { http, HttpResponse } from 'msw';
import { server } from '@test/setupBrowserTests';
import { createQueryClient } from '@shared/api/queryClient';
import { Density, Theme } from '@api';
import { settingsKeys, useSettingsMutation, useSettingsQuery } from './useSettingsQuery';
import { queryClient } from '@shared/api/queryClient';

const mockSettings = {
  theme: Theme.Dark,
  density: Density.Tight,
  fontSize: 16,
  sideBarCollapsed: true,
};

function makeWrapper() {
  const client = createQueryClient();
  return {
    client,
    Wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  };
}

describe('useSettingsQuery', () => {
  it('should return settings data when a session is active (200)', async () => {
    server.use(http.get('/api/settings', () => HttpResponse.json(mockSettings)));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSettingsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject(mockSettings);
  });

  it('should return null when no session is active (204)', async () => {
    server.use(http.get('/api/settings', () => new HttpResponse(null, { status: 204 })));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSettingsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('should set isError when server returns 500', async () => {
    server.use(http.get('/api/settings', () => HttpResponse.json({}, { status: 500 })));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSettingsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should not fetch when enabled is false', async () => {
    let requestCount = 0;
    server.use(
      http.get('/api/settings', () => {
        requestCount += 1;
        return HttpResponse.json(mockSettings);
      }),
    );

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSettingsQuery(false), { wrapper: Wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(requestCount).toBe(0);
  });

  it('should use settings.get query key', () => {
    expect(settingsKeys.get).toEqual(['settings', 'get']);
  });
});

describe('useSettingsMutation', () => {
  beforeEach(() => {
    // useSettingsMutation writes through the app-wide singleton queryClient
    // (not the per-test client from makeWrapper), so reset it between tests.
    queryClient.clear();
  });

  it('should sync the settings.get cache with the mutation response on success', async () => {
    server.use(http.put('/api/settings', () => HttpResponse.json(mockSettings)));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSettingsMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate(mockSettings);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(settingsKeys.get)).toMatchObject(mockSettings);
  });

  it('should set isError and leave the cache untouched when the update fails', async () => {
    server.use(http.put('/api/settings', () => HttpResponse.json({}, { status: 500 })));

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useSettingsMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate(mockSettings);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData(settingsKeys.get)).toBeUndefined();
  });
});
