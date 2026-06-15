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
    if (response.ok) {
      return response;
    }

    let body: unknown;
    try {
      body = await response.clone().json();
    } catch {
      body = await response.clone().text();
    }

    throw new ApiError(response.status, body);
  },

  onError: async ({ error }) => {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new NetworkError(error);
  },
};

// ─── Configuration factory ────────────────────────────────────────────────────

export interface ApiConfigOptions {
  /** Override the base URL. Defaults to `/api` (set by the OpenAPI generator). */
  basePath?: string;
}

/**
 * Builds the raw `ConfigurationParameters` object shared across all generated
 * OpenAPI clients.
 *
 * Returning the plain params (not a `Configuration` instance) lets every
 * generated client construct its own `Configuration` with its own private field,
 * avoiding the nominal-typing mismatch that occurs when two generated
 * `Configuration` classes both declare `private configuration`.
 *
 * Every call includes:
 * - `credentials: 'include'` — session cookies sent on every request.
 * - Error normalisation — non-2xx responses throw `ApiError`; network failures
 *   throw `NetworkError`.
 */
export function createApiConfigParams(
  opts: ApiConfigOptions = {},
): ConstructorParameters<typeof Configuration>[0] {
  return {
    basePath: opts.basePath,
    credentials: 'include',
    middleware: [errorMiddleware],
  };
}

// ─── Shared singleton ─────────────────────────────────────────────────────────

/**
 * Raw configuration parameters reusable by any generated client.
 *
 * Usage in a generated-client file:
 * ```ts
 * import { Configuration } from '@api/some-client';
 * import { sharedConfigParams } from '@/shared/api/httpClient';
 * export const someApi = new SomeApi(new Configuration(sharedConfigParams));
 * ```
 */
export const sharedConfigParams = createApiConfigParams();

/**
 * App-wide `Configuration` instance for the shared-client.
 * For other generated clients use `sharedConfigParams` directly.
 */
export function createApiConfig(opts: ApiConfigOptions = {}): Configuration {
  return new Configuration(createApiConfigParams(opts));
}

/** @deprecated Prefer `sharedConfigParams` for non-shared-client APIs to avoid nominal type mismatch. */
export const apiConfig = createApiConfig();
