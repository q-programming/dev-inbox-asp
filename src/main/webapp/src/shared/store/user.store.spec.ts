import { beforeEach, describe, expect, it } from 'vitest';
import useUserStore, { AuthStatus, USER_STORAGE_KEY } from './user.store.ts';
import type { UserDto } from '@api/auth';
import { AccountType } from '@api/auth';

const mockUserDto: UserDto = {
  id: 42,
  email: 'john.doe@example.com',
  firstName: 'John',
  lastName: 'Doe',
  accountType: AccountType.Regular,
};

beforeEach(() => {
  sessionStorage.clear();
  useUserStore.setState({
    status: AuthStatus.LOADING,
    firstName: '',
    lastName: '',
    identity: null,
  });
});

describe('useUserStore', () => {
  describe('initial state', () => {
    it('starts with LOADING status', () => {
      expect(useUserStore.getState().status).toBe(AuthStatus.LOADING);
    });

    it('starts with empty names and null identity', () => {
      const { firstName, lastName, identity } = useUserStore.getState();
      expect(firstName).toBe('');
      expect(lastName).toBe('');
      expect(identity).toBeNull();
    });
  });

  describe('setUser', () => {
    it('sets status to AUTHENTICATED', () => {
      useUserStore.getState().setUser(mockUserDto);
      expect(useUserStore.getState().status).toBe(AuthStatus.AUTHENTICATED);
    });

    it('populates firstName and lastName', () => {
      useUserStore.getState().setUser(mockUserDto);
      expect(useUserStore.getState().firstName).toBe('John');
      expect(useUserStore.getState().lastName).toBe('Doe');
    });

    it('populates identity with id, email and accountType', () => {
      useUserStore.getState().setUser(mockUserDto);
      expect(useUserStore.getState().identity).toEqual({
        id: 42,
        email: 'john.doe@example.com',
        accountType: AccountType.Regular,
      });
    });

    it('persists firstName, lastName and identity to sessionStorage', () => {
      useUserStore.getState().setUser(mockUserDto);
      const raw = sessionStorage.getItem(USER_STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.state.firstName).toBe('John');
      expect(parsed.state.lastName).toBe('Doe');
      expect(parsed.state.identity.email).toBe('john.doe@example.com');
    });

    it('handles missing optional fields gracefully', () => {
      useUserStore.getState().setUser({});
      const { firstName, lastName, identity } = useUserStore.getState();
      expect(firstName).toBe('');
      expect(lastName).toBe('');
      expect(identity?.id).toBe(0);
      expect(identity?.email).toBe('');
    });
  });

  describe('clearUser', () => {
    it('sets status to UNAUTHENTICATED', () => {
      useUserStore.getState().setUser(mockUserDto);
      useUserStore.getState().clearUser();
      expect(useUserStore.getState().status).toBe(AuthStatus.UNAUTHENTICATED);
    });

    it('resets names to empty and clears identity', () => {
      useUserStore.getState().setUser(mockUserDto);
      useUserStore.getState().clearUser();
      const { firstName, lastName, identity } = useUserStore.getState();
      expect(firstName).toBe('');
      expect(lastName).toBe('');
      expect(identity).toBeNull();
    });

    it('clears the sessionStorage entry', () => {
      useUserStore.getState().setUser(mockUserDto);
      useUserStore.getState().clearUser();
      const raw = sessionStorage.getItem(USER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        expect(parsed.state.firstName).toBe('');
        expect(parsed.state.identity).toBeNull();
      }
    });
  });
});
