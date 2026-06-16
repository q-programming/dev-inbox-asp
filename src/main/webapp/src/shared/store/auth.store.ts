import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AccountType, UserDto } from '@api/auth';
import { Theme } from '@shared/theme/theme.ts';

// ─── Storage keys ─────────────────────────────────────────────────────────────

/**
 * Centralised storage key constants.
 * Useful for clearing specific slices in tests (sessionStorage.removeItem(STORAGE_KEYS.identity))
 * and for inspecting state in browser DevTools without guessing key names.
 */
export const STORAGE_KEYS = {
  profile: 'devInbox.profile',
  identity: 'devInbox.identity',
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Non-sensitive display data — persisted to **localStorage**.
 *
 * Kept deliberately minimal (first/last name only) so that:
 * - It is safe to leave in localStorage indefinitely (no PII that requires tab-lifetime scoping).
 * - The app can render "Hello John" instantly on page load without waiting for a network call,
 *   enabling the optimistic-render pattern in AuthGuard / LandingPage.
 */
export interface AuthProfile {
  firstName: string;
  lastName: string;
  theme: Theme;
}

/**
 * Identifying details — persisted to **sessionStorage**.
 *
 * More sensitive than a display name (email, internal id, account type), so it is scoped to the
 * browser session: sessionStorage is cleared automatically when all tabs for the origin are
 * closed, limiting the exposure window compared to localStorage.
 */
export interface AuthIdentity {
  id: number;
  email: string;
  accountType: AccountType;
}

/**
 * The three states the auth flow can be in:
 *
 * - `LOADING`         — app just started; /me has not resolved yet. The UI may still render
 *                       optimistically if a cached `profile` exists in localStorage.
 * - `AUTHENTICATED`   — /me confirmed the JWT cookie is valid.
 * - `UNAUTHENTICATED` — /me failed (no cookie, expired, revoked). User must log in.
 *
 * `status` is intentionally **not persisted** — it always resets to LOADING on page load so
 * that every session is verified against the backend, even if the profile is cached.
 */
export enum AuthStatus {
  LOADING = 'loading',
  AUTHENTICATED = 'authenticated',
  UNAUTHENTICATED = 'unauthenticated',
}

interface AuthState {
  status: AuthStatus;
  profile: AuthProfile;
  identity: AuthIdentity | null;
  setUser: (user: UserDto) => void;
  clearUser: () => void;
  toggleTheme: () => void;
}

// ─── Session storage helpers (identity only) ──────────────────────────────────

/**
 * Why manual helpers instead of a second `persist` middleware?
 * `identity` is only written in two places — `setUser` and `clearUser` — so thin read/write
 * helpers are simpler and fully explicit, with no hidden middleware magic.
 */

const readIdentity = (): AuthIdentity | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.identity);
    return raw ? (JSON.parse(raw) as AuthIdentity) : null;
  } catch {
    return null;
  }
};

const writeIdentity = (identity: AuthIdentity | null) => {
  if (identity) {
    sessionStorage.setItem(STORAGE_KEYS.identity, JSON.stringify(identity));
  } else {
    sessionStorage.removeItem(STORAGE_KEYS.identity);
  }
};

function getSystemMode(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? Theme.DARK : Theme.LIGHT;
}

const defaultProfile: AuthProfile = {
  firstName: '',
  lastName: '',
  theme: getSystemMode(),
};

// ─── Store ────────────────────────────────────────────────────────────────────

/**
 * Auth store — single source of truth for the current user's session.
 *
 * ## Storage strategy
 *
 * | Slice      | Storage        | Key                   | Why                                      |
 * |------------|----------------|-----------------------|------------------------------------------|
 * | `profile`  | localStorage   | `devInbox.profile`    | Survives tab close; safe (display only)  |
 * | `identity` | sessionStorage | `devInbox.identity`   | Cleared on tab close; more sensitive     |
 * | `status`   | —              | —                     | Never persisted; always re-verified      |
 *
 * ## How `persist` works here
 *
 * `persist(creator, options)` wraps the Zustand state creator and intercepts every `set()` call.
 * After each state update it reads `options.partialize(state)` — the slice you want saved — and
 * serialises it to `options.storage` under `options.name`.
 *
 * On store initialisation, `persist` rehydrates the persisted slice back into the initial state
 * synchronously (localStorage reads are synchronous), so `profile` is available on the very first
 * render without any async wait or flicker.
 *
 * `partialize: (state) => ({ profile: state.profile })` limits what is written to localStorage —
 * `identity`, `status`, and action functions are excluded.
 *
 * ## Optimistic render flow
 *
 * 1. Page loads → `status = LOADING`, `profile` rehydrated from localStorage (may be non-null).
 * 2. `AuthGuard` renders children immediately if `profile` is present (fast "Hello John").
 * 3. `/me` resolves in the background:
 *    - Success → `setUser()` → `status = AUTHENTICATED`.
 *    - Failure → `clearUser()` → `status = UNAUTHENTICATED` → redirect to /login.
 */
const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      status: AuthStatus.LOADING,
      profile: defaultProfile,
      // identity is initialised manually because it lives in sessionStorage,
      // not in the localStorage slice that `persist` manages.
      identity: readIdentity(),

      setUser: (user: UserDto) => {
        const identity: AuthIdentity = {
          id: user.id ?? 0,
          email: user.email ?? '',
          accountType: user.accountType as AccountType,
        };
        writeIdentity(identity);
        set((state) => ({
          status: AuthStatus.AUTHENTICATED,
          profile: {
            firstName: user.firstName ?? '',
            lastName: user.lastName ?? '',
            theme: state.profile?.theme ?? Theme.LIGHT, // preserve or default
          },
          identity,
        }));
      },
      toggleTheme: () => {
        set((state) => {
          const theme = state.profile.theme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT;
          return {
            profile: state.profile
              ? { ...state.profile, theme }
              : { firstName: '', lastName: '', theme },
          };
        });
      },
      clearUser: () => {
        writeIdentity(null);
        set({ status: AuthStatus.UNAUTHENTICATED, profile: defaultProfile, identity: null });
      },
    }),
    {
      name: STORAGE_KEYS.profile,
      storage: createJSONStorage(() => localStorage),
      // Only persist the display profile — status and identity are excluded intentionally.
      partialize: (state) => ({ profile: state.profile }),
    },
  ),
);

export default useAuthStore;
