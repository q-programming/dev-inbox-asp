import type { Mutation, Query } from '@tanstack/react-query';
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import useAlertStore, { AlertType } from '@/shared/store/alert.store';
import { ApiError, NetworkError } from '@/shared/api/httpClient';

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
    };
    mutationMeta: {
      /** Same as `queryMeta.errorMessage` but for mutations. */
      errorMessage?: string | ErrorMessageResolver;
      /** Same as `queryMeta.silent` but for mutations. */
      silent?: boolean;
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

// ─── Cache error handlers ─────────────────────────────────────────────────────

const onQueryError = (error: Error, query: Query<unknown, unknown, unknown>): void => {
  if (query.meta?.silent) {
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
