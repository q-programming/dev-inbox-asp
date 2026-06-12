import { Configuration, type Middleware } from '@api/shared';

// ─── Error types ─────────────────────────────────────────────────────────────

/**
 * Thrown by the error middleware when the server returns a non-2xx response.
 *
 * @example
 * try {
 *   await someApi.doThing();
 * } catch (e) {
 *   if (e instanceof ApiError && e.status === 404) { ... }
 * }
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

// ─── Middleware ───────────────────────────────────────────────────────────────

const errorMiddleware: Middleware = {
  post: async ({ response }) => {
    if (response.ok) {return response;}

    let body: unknown;
    try {
      body = await response.clone().json();
    } catch {
      body = await response.clone().text();
    }

    throw new ApiError(response.status, body);
  },

  onError: async ({ error }) => {
    if (error instanceof ApiError) {throw error;}
    throw new NetworkError(error);
  },
};

// ─── Configuration factory ────────────────────────────────────────────────────

export interface ApiConfigOptions {
  /** Override the base URL. Defaults to `/api` (set by the OpenAPI generator). */
  basePath?: string;
}

/**
 * Creates a typed `Configuration` for the generated OpenAPI client.
 *
 * Every instance includes:
 * - `credentials: 'include'` — session cookies sent on every request.
 * - Error normalisation — non-2xx responses throw `ApiError`; network failures
 *   throw `NetworkError`.
 *
 * Whether those errors are surfaced as UI alerts is controlled at the
 * TanStack Query level via `meta.errorMessage` on individual queries/mutations.
 */
export function createApiConfig(opts: ApiConfigOptions = {}): Configuration {
  return new Configuration({
    basePath: opts.basePath,
    credentials: 'include',
    middleware: [errorMiddleware],
  });
}

// ─── Shared singleton ─────────────────────────────────────────────────────────

/** App-wide API configuration. Use when instantiating any generated API class. */
export const apiConfig = createApiConfig();
