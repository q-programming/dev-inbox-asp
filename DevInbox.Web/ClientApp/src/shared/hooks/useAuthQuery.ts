import { AuthClient, LoginRequest, RegisterRequest, UserDto } from '@api';
import useSettingsStore from '@feature/settings/store/settings.store';
import { ApiError, apiFetch, BASE_URL } from '@shared/api/httpClient.ts';
import useUserStore from '@shared/store/user.store.ts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

export const authApi = new AuthClient(BASE_URL, { fetch: apiFetch });

export const authKeys = {
  all: ['auth'] as const,
  me: ['auth', 'me'] as const,
} as const;

// ─── /me query ────────────────────────────────────────────────────────────────

/**
 * Fetches the current user from the backend using the jwt cookie.
 * Returns null (HTTP 204) when no session is active — never throws for that case.
 * Failures are silent — callers decide what to do via `useAuthBootstrap`.
 */
export const useMeQuery = () =>
  useQuery<UserDto | null | undefined, ApiError>({
    queryKey: authKeys.me,
    queryFn: async () => {
      try {
        return await authApi.me();
      } catch (e: unknown) {
        // NSwag throws SwaggerException with status 204 for "No user found" —
        // treat it as a null session rather than an error.
        if ((e as { status?: number })?.status === 204) return null;
        throw e;
      }
    },
    staleTime: 5 * 60_000,
    // Always re-verify on mount — covers OAuth callbacks where the cookie
    // has changed since the last cached /me response.
    refetchOnMount: 'always',
    retry: false,
    meta: { silent: true },
  });

// ─── Bootstrap hook ───────────────────────────────────────────────────────────

/**
 * Fires /me on mount and wires the result into the auth store.
 *
 * - Success with a user  → `store.setUser()` → status becomes `authenticated`
 * - Success with null    → `store.clearUser()` → status becomes `unauthenticated`
 * - Error (any)          → `store.clearUser()` → status becomes `unauthenticated`
 *
 * Must be called exactly once, inside `AuthGuard`, so it runs on every protected page.
 */
export const useAuthBootstrap = () => {
  const { data, isSuccess, isError } = useMeQuery();
  const { setUser, clearUser } = useUserStore();
  const { applyServerProfile } = useSettingsStore();

  useEffect(() => {
    if (!isSuccess) {
      return;
    }
    if (data) {
      setUser(data);
      applyServerProfile({}); //TODO update with actual user  values
    } else {
      clearUser();
    }
  }, [isSuccess, data, setUser, clearUser, applyServerProfile]);

  useEffect(() => {
    if (isError) {
      clearUser();
    }
  }, [isError, clearUser]);
};

// ─── Login mutation ───────────────────────────────────────────────────────────

/**
 * Submits credentials, receives the UserDto back (backend sets HttpOnly jwt cookie).
 * On success, persists the user into the auth store.
 */
export const useLoginMutation = () => {
  const { setUser } = useUserStore();
  const queryClient = useQueryClient();

  return useMutation<UserDto, ApiError, LoginRequest>({
    mutationFn: (credentials) => authApi.login(credentials),
    onSuccess: (user) => {
      setUser(user);
      queryClient.setQueryData(authKeys.me, user);
    },
    meta: {
      errorMessage: (error: Error) =>
        error instanceof ApiError && error.status === 401
          ? 'Invalid email or password.'
          : 'Sign-in failed. Please try again.',
    },
  });
};

// ─── Logout mutation ──────────────────────────────────────────────────────────

/**
 * Calls the backend logout endpoint (clears HttpOnly jwt cookie),
 * then wipes the auth store and query cache.
 */
export const useLogoutMutation = () => {
  const { clearUser } = useUserStore();
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, void>({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      // Clear regardless of success/failure — cookie may already be gone
      clearUser();
      queryClient.removeQueries({ queryKey: authKeys.all });
    },
    meta: { silent: true },
  });
};

// ─── Register mutation ────────────────────────────────────────────────────────

/**
 * Registers a new account. Does not log the user in — navigates to /login after success.
 */
export const useRegisterMutation = () =>
  useMutation<UserDto, ApiError, RegisterRequest>({
    mutationFn: (data) => authApi.register(data),
    meta: {
      errorMessage: (error: Error) =>
        error instanceof ApiError && error.status === 409
          ? 'An account with this email already exists.'
          : 'Registration failed. Please try again.',
    },
  });
