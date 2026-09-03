import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@test/renderWithProviders';
import useUserStore, { AuthStatus } from '@shared/store/user.store.ts';
import AuthGuard from './AuthGuard';
import { AppRoute } from '@app/routes';
import { AccountType, IntegrationStatus, IntegrationType } from '@api';

// Prevent useAuthBootstrap from making real API calls — AuthGuard behaviour
// is tested solely via store state.
vi.mock('@shared/hooks/useAuthQuery', () => ({
  useAuthBootstrap: vi.fn(),
}));

/** A connected integration — keeps these tests focused on auth, not onboarding redirects. */
const connectedIntegrations = [{ type: IntegrationType.Github, status: IntegrationStatus.ACTIVE }];
const adoOnlyConnectedIntegrations = [{ type: IntegrationType.Ado, status: IntegrationStatus.ACTIVE }];

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
  useUserStore.setState({
    status: AuthStatus.LOADING,
    firstName: '',
    lastName: '',
    identity: null,
  });
});

describe('AuthGuard', () => {
  describe('when status is LOADING', () => {
    it('should show a spinner when there is no cached profile', () => {
      useUserStore.setState({
        status: AuthStatus.LOADING,
        firstName: '',
        lastName: '',
        identity: null,
      });

      renderGuard();

      expect(screen.getByText('Loading…')).toBeTruthy();
    });

    it('should render the protected route immediately when a cached profile exists (optimistic render)', () => {
      useUserStore.setState({
        status: AuthStatus.LOADING,
        firstName: 'John',
        lastName: 'Doe',
        identity: null,
      });

      renderGuard();

      expect(screen.getByText('Protected content')).toBeTruthy();
    });
  });

  describe('when status is UNAUTHENTICATED', () => {
    it('should redirect to /login', () => {
      useUserStore.setState({
        status: AuthStatus.UNAUTHENTICATED,
        identity: null,
      });

      renderGuard();

      expect(screen.getByText('Login page')).toBeTruthy();
      expect(screen.queryByText('Protected content')).toBeFalsy();
    });
  });

  describe('when status is AUTHENTICATED', () => {
    it('should render the protected child route (Outlet)', () => {
      useUserStore.setState({
        status: AuthStatus.AUTHENTICATED,
        firstName: 'John',
        lastName: 'Doe',
        identity: {
          id: 1,
          email: 'test@example.com',
          accountType: AccountType.REGULAR,
          integrations: connectedIntegrations,
        },
      });

      renderGuard();

      expect(screen.getByText('Protected content')).toBeTruthy();
      expect(screen.queryByText('Login page')).toBeFalsy();
    });

    it('should render the protected child route when Azure DevOps is the only active integration', () => {
      useUserStore.setState({
        status: AuthStatus.AUTHENTICATED,
        firstName: 'John',
        lastName: 'Doe',
        identity: {
          id: 1,
          email: 'test@example.com',
          accountType: AccountType.REGULAR,
          integrations: adoOnlyConnectedIntegrations,
        },
      });

      renderGuard();

      expect(screen.getByText('Protected content')).toBeTruthy();
      expect(screen.queryByText('Login page')).toBeFalsy();
    });

    it('should redirect to /onboarding when the user has no active integrations', () => {
      useUserStore.setState({
        status: AuthStatus.AUTHENTICATED,
        firstName: 'John',
        lastName: 'Doe',
        identity: { id: 1, email: 'test@example.com', accountType: AccountType.REGULAR, integrations: [] },
      });

      renderWithProviders(
        <Routes>
          <Route element={<AuthGuard />}>
            <Route path="/protected" element={<div>Protected content</div>} />
            <Route path={AppRoute.ONBOARDING} element={<div>Onboarding page</div>} />
          </Route>
        </Routes>,
        { initialEntries: ['/protected'] },
      );

      expect(screen.getByText('Onboarding page')).toBeTruthy();
      expect(screen.queryByText('Protected content')).toBeFalsy();
    });
  });
});
