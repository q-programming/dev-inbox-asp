import type { Mutation, Query } from '@tanstack/react-query';
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import useAlertStore, { AlertType } from '@shared/store/alert.store';
import { ApiError, NetworkError } from '@shared/api/httpClient';
import { redirectTo, saveReturnPath } from '@shared/utils/navigation';
import { AppRoute } from '@app/routes';

// ─── TanStack Query meta augmentation ────────────────────────────────────────

/** Derives an alert message from the raw error (e.g. to vary text by status code). */
export type ErrorMessageResolver = (error: Error) => string;

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: {
      /**
       * Custom alert message shown when this query fails.
       *
       * - **string** — fixed message.
       * - **function** — called with the raw error; return value is shown.
       *
       * When omitted the built-in generic message is used
       * (`"Request failed (500)"`, `"Network error…"`, etc.).
       *
       * @example
       * meta: { errorMessage: 'Failed to load items, please try again.' }
       */
      errorMessage?: string | ErrorMessageResolver;
      /**
       * When `true`, no alert is shown on failure.
       * The error is still available via `query.error`.
       *
       * Use for background/silent fetches where failure is expected or unimportant
       * (e.g. auth-check on page load, health probe on the ok endpoint).
       *
       * @example
       * meta: { silent: true }
       */
      silent?: boolean;
      /**
       * When `true`, a 401 response is treated as a normal error (alert shown as usual)
       * instead of triggering the global "session expired" redirect to /login.
       *
       * Use for endpoints where a 401 is an expected, locally-handled outcome —
       * e.g. the login/register forms themselves, or the initial /me probe.
       *
       * @example
       * meta: { skipAuthRedirect: true }
       */
      skipAuthRedirect?: boolean;
    };
    mutationMeta: {
      /** Same as `queryMeta.errorMessage` but for mutations. */
      errorMessage?: string | ErrorMessageResolver;
      /** Same as `queryMeta.silent` but for mutations. */
      silent?: boolean;
      /** Same as `queryMeta.skipAuthRedirect` but for mutations. */
      skipAuthRedirect?: boolean;
    };
  }
}

// ─── Error → message ─────────────────────────────────────────────────────────

function toAlertMessage(error: Error, override?: string | ErrorMessageResolver): string {
  if (typeof override === 'function') {
    return override(error);
  }
  if (typeof override === 'string') {
    return override;
  }
  if (error instanceof ApiError) {
    const detail =
      error.body && typeof error.body === 'object' && 'message' in error.body
        ? ` — ${(error.body as { message: string }).message}`
        : '';
    return `Request failed (${error.status})${detail}`;
  }
  if (error instanceof NetworkError) {
    return 'Network error — please check your connection.';
  }
  return 'An unexpected error occurred.';
}

const dispatchErrorAlert = (error: Error, override?: string | ErrorMessageResolver): void => {
  useAlertStore.getState().addAlert({
    id: 0, // store assigns its own auto-incremented id
    type: AlertType.ERROR,
    message: toAlertMessage(error, override),
  });
};

/**
 * The session cookie is gone/expired (401) for an endpoint that wasn't expecting it.
 * Rather than showing a generic error alert, remember where the user was and send
 * them to /login so they can pick up where they left off after re-authenticating.
 */
const handleSessionExpired = (): void => {
  saveReturnPath();
  redirectTo(AppRoute.LOGIN);
};

const isUnhandledSessionExpiry = (error: Error, meta?: { skipAuthRedirect?: boolean }): boolean =>
  error instanceof ApiError && error.status === 401 && !meta?.skipAuthRedirect;

// ─── Cache error handlers ─────────────────────────────────────────────────────

const onQueryError = (error: Error, query: Query<unknown, unknown, unknown>): void => {
  if (query.meta?.silent) {
    return;
  }
  if (isUnhandledSessionExpiry(error, query.meta)) {
    handleSessionExpired();
    return;
  }
  dispatchErrorAlert(error, query.meta?.errorMessage);
};

const onMutationError = (
  error: Error,
  _variables: unknown,
  _context: unknown,
  mutation: Mutation<unknown, unknown, unknown, unknown>,
): void => {
  if (mutation.meta?.silent) {
    return;
  }
  if (isUnhandledSessionExpiry(error, mutation.meta)) {
    handleSessionExpired();
    return;
  }
  dispatchErrorAlert(error, mutation.meta?.errorMessage);
};

// ─── Singleton ────────────────────────────────────────────────────────────────

/**
 * Creates a QueryClient wired with the global error → alert store integration.
 * Useful for creating isolated instances in tests.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError: onQueryError }),
    mutationCache: new MutationCache({ onError: onMutationError }),
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1 },
    },
  });
}

/**
 * App-wide TanStack QueryClient.
 *
 * All query/mutation failures surface an alert by default.
 * - Customise the message: `meta: { errorMessage: 'Something went wrong.' }`
 * - Suppress silently:     `meta: { silent: true }`
 */
export const queryClient = createQueryClient();
