import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { http, HttpResponse } from 'msw';
import { server } from '@test/setupBrowserTests';
import { createQueryClient } from '@shared/api/queryClient';
import useAuthStore, { AuthStatus } from '@shared/store/auth.store';
import {
  authKeys,
  useAuthBootstrap,
  useLoginMutation,
  useLogoutMutation,
  useMeQuery,
  useRegisterMutation,
} from './useAuthQuery';

const mockUser = {
  id: 1,
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  accountType: 'REGULAR',
};

function makeWrapper() {
  const client = createQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  useAuthStore.setState({
    status: AuthStatus.LOADING,
    profile: null,
    identity: null,
  });
});

describe('useMeQuery', () => {
  it('should return user data when session is active (200)', async () => {
    server.use(http.post('/api/auth/me', () => HttpResponse.json(mockUser)));

    const { result } = renderHook(() => useMeQuery(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ email: 'test@example.com' });
  });

  it('should return null when no session is active (204)', async () => {
    server.use(http.post('/api/auth/me', () => new HttpResponse(null, { status: 204 })));

    const { result } = renderHook(() => useMeQuery(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('should set isError when server returns 500', async () => {
    server.use(http.post('/api/auth/me', () => HttpResponse.json({}, { status: 500 })));

    const { result } = renderHook(() => useMeQuery(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('should use auth.me query key', () => {
    expect(authKeys.me).toEqual(['auth', 'me']);
  });
});

describe('useAuthBootstrap', () => {
  it('should call setUser and set AUTHENTICATED when /me returns a user', async () => {
    server.use(http.post('/api/auth/me', () => HttpResponse.json(mockUser)));

    renderHook(() => useAuthBootstrap(), { wrapper: makeWrapper() });

    await waitFor(() => expect(useAuthStore.getState().status).toBe(AuthStatus.AUTHENTICATED));
    expect(useAuthStore.getState().profile?.firstName).toBe('John');
  });

  it('should call clearUser and set UNAUTHENTICATED when /me returns null (204)', async () => {
    server.use(http.post('/api/auth/me', () => new HttpResponse(null, { status: 204 })));

    renderHook(() => useAuthBootstrap(), { wrapper: makeWrapper() });

    await waitFor(() => expect(useAuthStore.getState().status).toBe(AuthStatus.UNAUTHENTICATED));
    expect(useAuthStore.getState().profile).toBeNull();
  });

  it('should call clearUser and set UNAUTHENTICATED when /me errors', async () => {
    server.use(http.post('/api/auth/me', () => HttpResponse.json({}, { status: 500 })));

    renderHook(() => useAuthBootstrap(), { wrapper: makeWrapper() });

    await waitFor(() => expect(useAuthStore.getState().status).toBe(AuthStatus.UNAUTHENTICATED));
  });

  it('should not overwrite AUTHENTICATED status on re-render (skip re-fetch hydration)', async () => {
    // Simulate already-authenticated state
    useAuthStore.setState({ status: AuthStatus.AUTHENTICATED });
    server.use(http.post('/api/auth/me', () => HttpResponse.json(mockUser)));

    const { rerender } = renderHook(() => useAuthBootstrap(), { wrapper: makeWrapper() });
    rerender();

    // status stays AUTHENTICATED — setUser not called again
    await waitFor(() => expect(useAuthStore.getState().status).toBe(AuthStatus.AUTHENTICATED));
  });
});

describe('useLoginMutation', () => {
  it('should set user in store on successful login', async () => {
    server.use(http.post('/api/auth/login', () => HttpResponse.json(mockUser)));

    const { result } = renderHook(() => useLoginMutation(), { wrapper: makeWrapper() });

    result.current.mutate({ email: 'test@example.com', password: 'password123' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().status).toBe(AuthStatus.AUTHENTICATED);
    expect(useAuthStore.getState().profile?.firstName).toBe('John');
  });

  it('should set isError on 401 invalid credentials', async () => {
    server.use(http.post('/api/auth/login', () => HttpResponse.json({}, { status: 401 })));

    const { result } = renderHook(() => useLoginMutation(), { wrapper: makeWrapper() });

    result.current.mutate({ email: 'test@example.com', password: 'wrong' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useAuthStore.getState().status).toBe(AuthStatus.LOADING);
  });
});

describe('useLogoutMutation', () => {
  it('should clear the auth store on successful logout', async () => {
    server.use(http.post('/api/auth/logout', () => new HttpResponse(null, { status: 204 })));
    useAuthStore.setState({ status: AuthStatus.AUTHENTICATED });

    const { result } = renderHook(() => useLogoutMutation(), { wrapper: makeWrapper() });
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().status).toBe(AuthStatus.UNAUTHENTICATED);
  });

  it('should still clear the auth store even when logout API fails', async () => {
    server.use(http.post('/api/auth/logout', () => HttpResponse.json({}, { status: 500 })));
    useAuthStore.setState({ status: AuthStatus.AUTHENTICATED });

    const { result } = renderHook(() => useLogoutMutation(), { wrapper: makeWrapper() });
    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useAuthStore.getState().status).toBe(AuthStatus.UNAUTHENTICATED);
  });
});

describe('useRegisterMutation', () => {
  it('should return the created UserDto on success', async () => {
    server.use(http.post('/api/auth/register', () => HttpResponse.json(mockUser, { status: 201 })));

    const { result } = renderHook(() => useRegisterMutation(), { wrapper: makeWrapper() });

    result.current.mutate({
      email: 'new@example.com',
      password: 'SecretPass1!',
      firstName: 'New',
      lastName: 'User',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.email).toBe('test@example.com');
  });

  it('should set isError on 409 duplicate email', async () => {
    server.use(http.post('/api/auth/register', () => HttpResponse.json({}, { status: 409 })));

    const { result } = renderHook(() => useRegisterMutation(), { wrapper: makeWrapper() });

    result.current.mutate({
      email: 'duplicate@example.com',
      password: 'SecretPass1!',
      firstName: 'Dup',
      lastName: 'User',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
