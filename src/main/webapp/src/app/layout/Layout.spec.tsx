import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@test/renderWithProviders';
import useAuthStore, { AuthStatus } from '@shared/store/auth.store';
import { Theme } from '@shared/theme/theme';
import { AppRoute, NAV_ITEMS } from '@app/routes';
import AppLayout from './Layout';

const mockLogoutMutate = vi.hoisted(() => vi.fn());

vi.mock('@shared/hooks/useAuthQuery', () => ({
  useLogoutMutation: () => ({
    mutate: mockLogoutMutate,
    isPending: false,
  }),
}));

const emptyProfile = { firstName: '', lastName: '', theme: Theme.LIGHT };

function renderLayout() {
  return renderWithProviders(
    <Routes>
      <Route element={<AppLayout />}>
        <Route path={AppRoute.INBOX} element={<div>Inbox content</div>} />
        <Route path={AppRoute.SETTINGS} element={<div>Settings content</div>} />
      </Route>
    </Routes>,
    { initialEntries: [AppRoute.INBOX] },
  );
}

beforeEach(() => {
  mockLogoutMutate.mockClear();
  useAuthStore.setState({
    status: AuthStatus.AUTHENTICATED,
    profile: emptyProfile,
    identity: null,
  });
});

describe('AppLayout', () => {
  describe('branding', () => {
    it('should render the app title', () => {
      renderLayout();
      expect(screen.getByText('Dev Inbox')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should render all nav items from NAV_ITEMS', () => {
      renderLayout();
      NAV_ITEMS.forEach(({ label }) => {
        expect(screen.getByRole('link', { name: label })).toBeTruthy();
      });
    });

    it('should navigate to settings when settings nav link is clicked', async () => {
      const user = userEvent.setup();
      renderLayout();

      await user.click(screen.getByRole('link', { name: 'Settings' }));

      expect(screen.getByText('Settings content')).toBeTruthy();
    });

    it('should render child route content via Outlet', () => {
      renderLayout();
      expect(screen.getByText('Inbox content')).toBeTruthy();
    });
  });

  describe('user profile', () => {
    it('should show full name when profile has a name', () => {
      useAuthStore.setState({
        status: AuthStatus.AUTHENTICATED,
        profile: { firstName: 'Jane', lastName: 'Doe', theme: Theme.LIGHT },
        identity: null,
      });

      renderLayout();

      expect(screen.getByText(/jane doe/i)).toBeTruthy();
    });

    it('should show email alongside name when identity is present', () => {
      useAuthStore.setState({
        status: AuthStatus.AUTHENTICATED,
        profile: { firstName: 'Jane', lastName: 'Doe', theme: Theme.LIGHT },
        identity: { id: 1, email: 'jane@example.com', accountType: 'REGULAR' },
      });

      renderLayout();

      expect(screen.getByText('(jane@example.com)')).toBeTruthy();
    });

    it('should not render sign out button when profile has no name (anonymous)', () => {
      useAuthStore.setState({
        status: AuthStatus.AUTHENTICATED,
        profile: emptyProfile,
        identity: null,
      });

      renderLayout();

      expect(screen.queryByRole('button', { name: /sign out/i })).toBeFalsy();
    });
  });

  describe('sign out', () => {
    it('should render the Sign out button when profile has a name', () => {
      useAuthStore.setState({
        status: AuthStatus.AUTHENTICATED,
        profile: { firstName: 'Jane', lastName: 'Doe', theme: Theme.LIGHT },
        identity: null,
      });

      renderLayout();

      expect(screen.getByRole('button', { name: /sign out/i })).toBeTruthy();
    });

    it('should call logout mutation when Sign out is clicked', async () => {
      const user = userEvent.setup();
      useAuthStore.setState({
        status: AuthStatus.AUTHENTICATED,
        profile: { firstName: 'Jane', lastName: 'Doe', theme: Theme.LIGHT },
        identity: null,
      });

      renderLayout();

      await user.click(screen.getByRole('button', { name: /sign out/i }));

      expect(mockLogoutMutate).toHaveBeenCalledOnce();
    });
  });
});
