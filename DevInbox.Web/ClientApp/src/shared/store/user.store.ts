import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AccountType, UserDto } from '@api';
import { IntegrationDto } from '@api';

// ─── Storage key ──────────────────────────────────────────────────────────────

export const USER_STORAGE_KEY = 'devInbox.user';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * All user session data in one place — persisted to **sessionStorage**.
 * sessionStorage is cleared automatically when all tabs for the origin are closed,
 * limiting exposure of PII (email, id) to the active browser session.
 */
export interface AuthIdentity {
  id: number;
  email: string;
  accountType: AccountType;
  integrations?: IntegrationDto[];
}

/**
 * The three states the auth flow can be in:
 *
 * - `LOADING`         — app just started; /me has not resolved yet.
 * - `AUTHENTICATED`   — /me confirmed the JWT cookie is valid.
 * - `UNAUTHENTICATED` — /me failed (no cookie, expired, revoked). User must log in.
 *
 * `status` is **not persisted** — it always resets to LOADING on page load so
 * every session is re-verified against the backend.
 */
export enum AuthStatus {
  LOADING = 'loading',
  AUTHENTICATED = 'authenticated',
  UNAUTHENTICATED = 'unauthenticated',
}

interface UserState {
  status: AuthStatus;
  firstName: string;
  lastName: string;
  identity: AuthIdentity | null;
  setUser: (user: UserDto) => void;
  clearUser: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

/**
 * Auth store — single source of truth for the current user's session.
 *
 * ## Storage strategy
 *
 * | Slice                         | Storage        | Key              |
 * |-------------------------------|----------------|------------------|
 * | `firstName`, `lastName`, `identity` | sessionStorage | `devInbox.user`  |
 * | `status`                      | —              | never persisted  |
 *
 * UI preferences (theme, density, fontSize, sidebar) live in `useSettingsStore`
 * (localStorage) and are intentionally decoupled from authentication.
 */
const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      status: AuthStatus.LOADING,
      firstName: '',
      lastName: '',
      identity: null,

      setUser: (user: UserDto) => {
        const identity: AuthIdentity = {
          id: user.id ?? 0,
          email: user.email ?? '',
          accountType: user.accountType as AccountType,
          integrations: user.integrations,
        };
        set({
          status: AuthStatus.AUTHENTICATED,
          firstName: user.firstName ?? '',
          lastName: user.lastName ?? '',
          identity,
        });
      },

      clearUser: () =>
        set({ status: AuthStatus.UNAUTHENTICATED, firstName: '', lastName: '', identity: null }),
    }),
    {
      name: USER_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      // status is excluded — it must always re-verify on page load.
      partialize: (state) => ({
        firstName: state.firstName,
        lastName: state.lastName,
        identity: state.identity,
      }),
    },
  ),
);

export default useUserStore;
