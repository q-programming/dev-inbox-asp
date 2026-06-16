import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@test/renderWithProviders';
import useAuthStore, { AuthStatus } from '@shared/store/auth.store';
import { Theme } from '@shared/theme/theme';
import AuthGuard from './AuthGuard';
import { AppRoute } from '@app/routes';

// Prevent useAuthBootstrap from making real API calls — AuthGuard behaviour
// is tested solely via store state.
vi.mock('@shared/hooks/useAuthQuery', () => ({
  useAuthBootstrap: vi.fn(),
}));

const emptyProfile = { firstName: '', lastName: '', theme: Theme.LIGHT };

function renderGuard(initialPath = '/protected') {
  return renderWithProviders(
    <Routes>
      <Route element={<AuthGuard />}>
        <Route path="/protected" element={<div>Protected content</div>} />
      </Route>
      <Route path={AppRoute.LOGIN} element={<div>Login page</div>} />
    </Routes>,
    { initialEntries: [initialPath] },
  );
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  useAuthStore.setState({ status: AuthStatus.LOADING, profile: emptyProfile, identity: null });
});

describe('AuthGuard', () => {
  describe('when status is LOADING', () => {
    it('should show a spinner when there is no cached profile', () => {
      useAuthStore.setState({ status: AuthStatus.LOADING, profile: emptyProfile, identity: null });

      renderGuard();

      expect(screen.getByText('Loading…')).toBeTruthy();
    });

    it('should render the protected route immediately when a cached profile exists (optimistic render)', () => {
      useAuthStore.setState({
        status: AuthStatus.LOADING,
        profile: { firstName: 'John', lastName: 'Doe', theme: Theme.LIGHT },
        identity: null,
      });

      renderGuard();

      expect(screen.getByText('Protected content')).toBeTruthy();
    });
  });

  describe('when status is UNAUTHENTICATED', () => {
    it('should redirect to /login', () => {
      useAuthStore.setState({
        status: AuthStatus.UNAUTHENTICATED,
        profile: emptyProfile,
        identity: null,
      });

      renderGuard();

      expect(screen.getByText('Login page')).toBeTruthy();
      expect(screen.queryByText('Protected content')).toBeFalsy();
    });
  });

  describe('when status is AUTHENTICATED', () => {
    it('should render the protected child route (Outlet)', () => {
      useAuthStore.setState({
        status: AuthStatus.AUTHENTICATED,
        profile: { firstName: 'John', lastName: 'Doe', theme: Theme.LIGHT },
        identity: { id: 1, email: 'test@example.com', accountType: 'REGULAR' },
      });

      renderGuard();

      expect(screen.getByText('Protected content')).toBeTruthy();
      expect(screen.queryByText('Login page')).toBeFalsy();
    });
  });
});
