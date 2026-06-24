import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query';
import React from 'react';
import { createQueryClient } from './queryClient';
import { ApiError, NetworkError } from './httpClient';

const { mockAddAlert } = vi.hoisted(() => ({ mockAddAlert: vi.fn() }));

vi.mock('@shared/store/alert.store', () => ({
  default: { getState: () => ({ addAlert: mockAddAlert }) },
  AlertType: { SUCCESS: 0, WARNING: 1, ERROR: 2 },
}));

function makeWrapper() {
  const client = createQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('queryClient error handling', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('query errors', () => {
    it('should dispatch an alert with status and body message for ApiError', async () => {
      const { result } = renderHook(
        () =>
          useQuery({
            queryKey: ['test'],
            queryFn: () => Promise.reject(new ApiError(500, { message: 'Server exploded' })),
            retry: false,
          }),
        { wrapper: makeWrapper() },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(mockAddAlert).toHaveBeenCalledOnce();
      expect(mockAddAlert).toHaveBeenCalledWith(
        expect.objectContaining({ type: 2, message: 'Request failed (500) — Server exploded' }),
      );
    });

    it('should dispatch status-only message when ApiError body has no message field', async () => {
      const { result } = renderHook(
        () =>
          useQuery({
            queryKey: ['test'],
            queryFn: () => Promise.reject(new ApiError(404, null)),
            retry: false,
          }),
        { wrapper: makeWrapper() },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(mockAddAlert).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Request failed (404)' }),
      );
    });

    it('should dispatch connectivity message for NetworkError', async () => {
      const { result } = renderHook(
        () =>
          useQuery({
            queryKey: ['test'],
            queryFn: () => Promise.reject(new NetworkError(new TypeError('Failed to fetch'))),
            retry: false,
          }),
        { wrapper: makeWrapper() },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(mockAddAlert).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Network error — please check your connection.' }),
      );
    });

    it('should dispatch a generic fallback message for unknown error types', async () => {
      const { result } = renderHook(
        () =>
          useQuery({
            queryKey: ['test'],
            queryFn: () => Promise.reject(new Error('Something weird')),
            retry: false,
          }),
        { wrapper: makeWrapper() },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(mockAddAlert).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'An unexpected error occurred.' }),
      );
    });

    it('should dispatch a custom static string from meta.errorMessage', async () => {
      const { result } = renderHook(
        () =>
          useQuery({
            queryKey: ['test'],
            queryFn: () => Promise.reject(new ApiError(503, {})),
            retry: false,
            meta: { errorMessage: 'Service is down.' },
          }),
        { wrapper: makeWrapper() },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(mockAddAlert).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Service is down.' }),
      );
    });

    it('should dispatch the return value of a meta.errorMessage resolver function', async () => {
      const { result } = renderHook(
        () =>
          useQuery({
            queryKey: ['test'],
            queryFn: () => Promise.reject(new ApiError(503, {})),
            retry: false,
            meta: {
              errorMessage: (err) =>
                err instanceof ApiError && err.status === 503
                  ? 'Service temporarily unavailable.'
                  : 'Unexpected error.',
            },
          }),
        { wrapper: makeWrapper() },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(mockAddAlert).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Service temporarily unavailable.' }),
      );
    });

    it('should not dispatch an alert when meta.silent is true', async () => {
      const { result } = renderHook(
        () =>
          useQuery({
            queryKey: ['test'],
            queryFn: () => Promise.reject(new ApiError(401, {})),
            retry: false,
            meta: { silent: true },
          }),
        { wrapper: makeWrapper() },
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(mockAddAlert).not.toHaveBeenCalled();
    });
  });

  describe('mutation errors', () => {
    it('should dispatch an alert when a mutation fails', async () => {
      const { result } = renderHook(
        () =>
          useMutation({
            mutationFn: (): Promise<never> =>
              Promise.reject(new ApiError(400, { message: 'Bad request' })),
          }),
        { wrapper: makeWrapper() },
      );

      result.current.mutate(undefined);
      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(mockAddAlert).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Request failed (400) — Bad request' }),
      );
    });

    it('should dispatch a custom errorMessage string on mutation failure', async () => {
      const { result } = renderHook(
        () =>
          useMutation({
            mutationFn: (): Promise<never> => Promise.reject(new ApiError(400, {})),
            meta: { errorMessage: 'Failed to save.' },
          }),
        { wrapper: makeWrapper() },
      );

      result.current.mutate(undefined);
      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(mockAddAlert).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to save.' }),
      );
    });

    it('should not dispatch an alert when mutation meta.silent is true', async () => {
      const { result } = renderHook(
        () =>
          useMutation({
            mutationFn: (): Promise<never> => Promise.reject(new ApiError(500, {})),
            meta: { silent: true },
          }),
        { wrapper: makeWrapper() },
      );

      result.current.mutate(undefined);
      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(mockAddAlert).not.toHaveBeenCalled();
    });
  });
});
