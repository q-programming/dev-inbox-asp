import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@shared/api/queryClient';
import useAuthStore, { AuthStatus } from '@shared/store/auth.store';
import AuthGuard from './AuthGuard';
import { AppRoute } from '@app/routes';

// Prevent useAuthBootstrap from making real API calls — AuthGuard behaviour
// is tested solely via store state.
vi.mock('@shared/hooks/useAuthQuery', () => ({
  useAuthBootstrap: vi.fn(),
}));

function renderGuard(initialPath = '/protected') {
  const client = createQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route path="/protected" element={<div>Protected content</div>} />
          </Route>
          <Route path={AppRoute.LOGIN} element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  useAuthStore.setState({ status: AuthStatus.LOADING, profile: null, identity: null });
});

describe('AuthGuard', () => {
  describe('when status is LOADING', () => {
    it('should show a spinner when there is no cached profile', () => {
      useAuthStore.setState({ status: AuthStatus.LOADING, profile: null, identity: null });

      renderGuard();

      expect(screen.getByText('Loading…')).toBeTruthy();
    });

    it('should render the protected route immediately when a cached profile exists (optimistic render)', () => {
      useAuthStore.setState({
        status: AuthStatus.LOADING,
        profile: { firstName: 'John', lastName: 'Doe' },
        identity: null,
      });

      renderGuard();

      expect(screen.getByText('Protected content')).toBeTruthy();
    });
  });

  describe('when status is UNAUTHENTICATED', () => {
    it('should redirect to /login', () => {
      useAuthStore.setState({ status: AuthStatus.UNAUTHENTICATED, profile: null, identity: null });

      renderGuard();

      expect(screen.getByText('Login page')).toBeTruthy();
      expect(screen.queryByText('Protected content')).toBeFalsy();
    });
  });

  describe('when status is AUTHENTICATED', () => {
    it('should render the protected child route (Outlet)', () => {
      useAuthStore.setState({
        status: AuthStatus.AUTHENTICATED,
        profile: { firstName: 'John', lastName: 'Doe' },
        identity: { id: 1, email: 'test@example.com', accountType: 'REGULAR' },
      });

      renderGuard();

      expect(screen.getByText('Protected content')).toBeTruthy();
      expect(screen.queryByText('Login page')).toBeFalsy();
    });
  });
});
