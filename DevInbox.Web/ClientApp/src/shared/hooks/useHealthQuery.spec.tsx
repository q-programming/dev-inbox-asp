import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { http, HttpResponse } from 'msw';
import { server } from '@test/setupBrowserTests';
import useAlertStore, { AlertType } from '@shared/store/alert.store';
import { createQueryClient } from '@shared/api/queryClient';
import { healthKeys, useHealthQuery, useOkHealthQuery } from './useHealthQuery';

const HEALTH_UP = { status: 'UP' };

function makeWrapper() {
  const client = createQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('health query hooks', () => {
  beforeEach(() => {
    useAlertStore.setState({ alerts: [] });
  });

  describe('useHealthQuery', () => {
    it('should return health data on success', async () => {
      server.use(http.get('/api/healthz', () => HttpResponse.json(HEALTH_UP)));

      const { result } = renderHook(() => useHealthQuery(), { wrapper: makeWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(HEALTH_UP);
      expect(useAlertStore.getState().alerts).toHaveLength(0);
    });

    it('should dispatch the custom error message alert on failure', async () => {
      server.use(http.get('/api/healthz', () => HttpResponse.json({}, { status: 503 })));

      const { result } = renderHook(() => useHealthQuery(), { wrapper: makeWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      const { alerts } = useAlertStore.getState();
      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toMatchObject({
        type: AlertType.ERROR,
        message: 'Service is temporarily unavailable, try again later.',
      });
    });

    it('should not dispatch an alert when silenced at the call-site', async () => {
      server.use(http.get('/api/healthz', () => HttpResponse.json({}, { status: 503 })));

      const { result } = renderHook(() => useHealthQuery({ meta: { silent: true } }), {
        wrapper: makeWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(useAlertStore.getState().alerts).toHaveLength(0);
    });
  });

  describe('useOkHealthQuery', () => {
    it('should return health data on success', async () => {
      server.use(http.get('/api/health', () => HttpResponse.json(HEALTH_UP)));

      const { result } = renderHook(() => useOkHealthQuery(), { wrapper: makeWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(HEALTH_UP);
    });

    it('should not dispatch an alert on failure (silent by default)', async () => {
      server.use(http.get('/api/health', () => HttpResponse.json({}, { status: 503 })));

      const { result } = renderHook(() => useOkHealthQuery(), { wrapper: makeWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(useAlertStore.getState().alerts).toHaveLength(0);
    });
  });

  describe('healthKeys', () => {
    it('should use distinct query keys to prevent shared caching', () => {
      expect(healthKeys.all).toEqual(['health']);
      expect(healthKeys.ok).toEqual(['health', 'ok']);
      expect(healthKeys.all).not.toEqual(healthKeys.ok);
    });
  });
});
