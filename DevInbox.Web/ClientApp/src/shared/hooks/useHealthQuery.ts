import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { ApiError, apiFetch, BASE_URL } from '@shared/api/httpClient';
import { HealthClient, HealthStatus } from '@api';

export const healthApi = new HealthClient(BASE_URL, { fetch: apiFetch });

export const healthKeys = {
  all: ['health'] as const,
  ok: ['health', 'ok'] as const,
} as const;

type HealthQueryOptions = Omit<UseQueryOptions<HealthStatus, ApiError>, 'queryKey' | 'queryFn'>;

/**
 * Returns the current backend health status.
 * Shows a custom alert when the request fails.
 *
 * @example — silence at the call-site
 * useHealthQuery({ meta: { silent: true } })
 */
export const useHealthQuery = (options: HealthQueryOptions = {}) =>
  useQuery<HealthStatus, ApiError>({
    queryKey: healthKeys.all,
    queryFn: () => healthApi.healthCheck(),
    staleTime: 30_000,
    retry: false,
    meta: {
      errorMessage: 'Service is temporarily unavailable, try again later.',
    },
    ...options,
  });

/**
 * Silent health probe via /health/ok.
 * Failures are NOT surfaced as alerts — available only via `query.error`.
 */
export const useOkHealthQuery = (options: HealthQueryOptions = {}) =>
  useQuery<HealthStatus, ApiError>({
    queryKey: healthKeys.ok,
    queryFn: () => healthApi.healthCheck(),
    staleTime: 30_000,
    retry: false,
    meta: { silent: true },
    ...options,
  });
