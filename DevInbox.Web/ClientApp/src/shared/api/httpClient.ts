// ─── Error types ─────────────────────────────────────────────────────────────

/**
 * Thrown when the server returns a non-2xx response.
 */
export class ApiError extends Error {
  override name = 'ApiError' as const;

  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`HTTP ${status}`);
  }
}

/**
 * Thrown when the fetch itself fails before a response is received —
 * e.g. DNS failure, timeout, CORS pre-flight rejection, or the device going offline.
 */
export class NetworkError extends Error {
  override name = 'NetworkError' as const;

  constructor(public readonly networkCause: unknown) {
    super('Network request failed');
  }
}

// ─── Custom fetch wrapper ─────────────────────────────────────────────────────

/**
 * A fetch implementation compatible with NSwag-generated clients.
 * Automatically includes credentials (cookies) and normalises errors.
 *
 * Pass to any generated client:
 * ```ts
 * import { apiFetch, BASE_URL } from '@shared/api/httpClient';
 * export const inboxApi = new InboxClient(BASE_URL, { fetch: apiFetch });
 * ```
 */
export const apiFetch = async (url: RequestInfo, init?: RequestInit): Promise<Response> => {
  let response: Response;
  try {
    response = await fetch(url, { ...init, credentials: 'include' });
  } catch (err) {
    throw new NetworkError(err);
  }

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.clone().json();
    } catch {
      body = await response.clone().text();
    }
    throw new ApiError(response.status, body);
  }

  return response;
};

/** Base URL for all API clients. Matches the server prefix defined in api.yml. */
export const BASE_URL = '/api';
