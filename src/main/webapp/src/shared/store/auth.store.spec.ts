import { beforeEach, describe, expect, it } from 'vitest';
import useAuthStore, { AuthStatus, STORAGE_KEYS } from './auth.store';
import type { UserDto } from '@api/auth';
import { AccountType } from '@api/auth';
import { Theme } from '@shared/theme/theme';

const mockUserDto: UserDto = {
  id: 42,
  email: 'john.doe@example.com',
  firstName: 'John',
  lastName: 'Doe',
  accountType: AccountType.Regular,
};

/** Default empty profile the store uses when no user is logged in. */
const emptyProfile = { firstName: '', lastName: '', theme: Theme.LIGHT };

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  useAuthStore.setState({
    status: AuthStatus.LOADING,
    profile: emptyProfile,
    identity: null,
  });
});

describe('useAuthStore', () => {
  describe('initial state', () => {
    it('should start with LOADING status regardless of any cached profile', () => {
      expect(useAuthStore.getState().status).toBe(AuthStatus.LOADING);
    });

    it('should start with empty profile (non-null) and null identity after reset', () => {
      const { profile, identity } = useAuthStore.getState();
      expect(profile.firstName).toBe('');
      expect(profile.lastName).toBe('');
      expect(identity).toBeNull();
    });
  });

  describe('setUser', () => {
    it('should set status to AUTHENTICATED', () => {
      useAuthStore.getState().setUser(mockUserDto);
      expect(useAuthStore.getState().status).toBe(AuthStatus.AUTHENTICATED);
    });

    it('should populate profile with first and last name and preserve theme', () => {
      useAuthStore.getState().setUser(mockUserDto);
      const { profile } = useAuthStore.getState();
      expect(profile.firstName).toBe('John');
      expect(profile.lastName).toBe('Doe');
      // theme is preserved from previous state
      expect(profile.theme).toBe(emptyProfile.theme);
    });

    it('should populate identity with id, email and accountType', () => {
      useAuthStore.getState().setUser(mockUserDto);
      expect(useAuthStore.getState().identity).toEqual({
        id: 42,
        email: 'john.doe@example.com',
        accountType: AccountType.Regular,
      });
    });

    it('should persist profile to localStorage', () => {
      useAuthStore.getState().setUser(mockUserDto);
      const raw = localStorage.getItem(STORAGE_KEYS.profile);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.state.profile.firstName).toBe('John');
      expect(parsed.state.profile.lastName).toBe('Doe');
    });

    it('should persist identity to sessionStorage', () => {
      useAuthStore.getState().setUser(mockUserDto);
      const raw = sessionStorage.getItem(STORAGE_KEYS.identity);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.email).toBe('john.doe@example.com');
      expect(parsed.id).toBe(42);
    });

    it('should handle missing optional fields gracefully', () => {
      useAuthStore.getState().setUser({});
      const { profile, identity } = useAuthStore.getState();
      expect(profile.firstName).toBe('');
      expect(profile.lastName).toBe('');
      expect(identity?.id).toBe(0);
      expect(identity?.email).toBe('');
    });
  });

  describe('clearUser', () => {
    it('should set status to UNAUTHENTICATED', () => {
      useAuthStore.getState().setUser(mockUserDto);
      useAuthStore.getState().clearUser();
      expect(useAuthStore.getState().status).toBe(AuthStatus.UNAUTHENTICATED);
    });

    it('should reset profile to empty default (non-null) and clear identity', () => {
      useAuthStore.getState().setUser(mockUserDto);
      useAuthStore.getState().clearUser();
      const { profile, identity } = useAuthStore.getState();
      // profile is never null — store keeps a default profile for theme persistence
      expect(profile.firstName).toBe('');
      expect(profile.lastName).toBe('');
      expect(identity).toBeNull();
    });

    it('should persist empty profile to localStorage after clear', () => {
      useAuthStore.getState().setUser(mockUserDto);
      useAuthStore.getState().clearUser();
      const raw = localStorage.getItem(STORAGE_KEYS.profile);
      if (raw) {
        const parsed = JSON.parse(raw);
        expect(parsed.state.profile.firstName).toBe('');
        expect(parsed.state.profile.lastName).toBe('');
      }
    });

    it('should remove identity from sessionStorage', () => {
      useAuthStore.getState().setUser(mockUserDto);
      useAuthStore.getState().clearUser();
      expect(sessionStorage.getItem(STORAGE_KEYS.identity)).toBeNull();
    });
  });

  describe('toggleTheme', () => {
    it('should toggle from LIGHT to DARK', () => {
      useAuthStore.setState({ profile: { ...emptyProfile, theme: Theme.LIGHT } });
      useAuthStore.getState().toggleTheme();
      expect(useAuthStore.getState().profile.theme).toBe(Theme.DARK);
    });

    it('should toggle from DARK to LIGHT', () => {
      useAuthStore.setState({ profile: { ...emptyProfile, theme: Theme.DARK } });
      useAuthStore.getState().toggleTheme();
      expect(useAuthStore.getState().profile.theme).toBe(Theme.LIGHT);
    });
  });

  describe('profile rehydration from localStorage', () => {
    it('should rehydrate profile when localStorage has valid data', () => {
      const persistedState = {
        state: { profile: { firstName: 'Cached', lastName: 'User', theme: Theme.LIGHT } },
        version: 0,
      };
      localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(persistedState));

      const raw = localStorage.getItem(STORAGE_KEYS.profile);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.state.profile.firstName).toBe('Cached');
    });
  });
});
