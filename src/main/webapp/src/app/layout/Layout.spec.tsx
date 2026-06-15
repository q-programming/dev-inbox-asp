import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@shared/api/queryClient';
import useAuthStore, { AuthStatus } from '@shared/store/auth.store';
import { AppRoute, NAV_ITEMS } from '@app/routes';
import AppLayout from './Layout';

const mockLogoutMutate = vi.hoisted(() => vi.fn());

vi.mock('@shared/hooks/useAuthQuery', () => ({
  useLogoutMutation: () => ({
    mutate: mockLogoutMutate,
    isPending: false,
  }),
}));

function renderLayout() {
  const client = createQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[AppRoute.INBOX]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path={AppRoute.INBOX} element={<div>Inbox content</div>} />
            <Route path={AppRoute.SETTINGS} element={<div>Settings content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockLogoutMutate.mockClear();
  useAuthStore.setState({ status: AuthStatus.AUTHENTICATED, profile: null, identity: null });
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
    it('should show full name when profile is present', () => {
      useAuthStore.setState({
        status: AuthStatus.AUTHENTICATED,
        profile: { firstName: 'Jane', lastName: 'Doe' },
        identity: null,
      });

      renderLayout();

      expect(screen.getByText(/jane doe/i)).toBeTruthy();
    });

    it('should show email alongside name when identity is present', () => {
      useAuthStore.setState({
        status: AuthStatus.AUTHENTICATED,
        profile: { firstName: 'Jane', lastName: 'Doe' },
        identity: { id: 1, email: 'jane@example.com', accountType: 'REGULAR' },
      });

      renderLayout();

      expect(screen.getByText('(jane@example.com)')).toBeTruthy();
    });

    it('should not render user info section when profile is null', () => {
      useAuthStore.setState({ status: AuthStatus.AUTHENTICATED, profile: null, identity: null });

      renderLayout();

      expect(screen.queryByRole('button', { name: /sign out/i })).toBeFalsy();
    });
  });

  describe('sign out', () => {
    it('should render the Sign out button when profile is present', () => {
      useAuthStore.setState({
        status: AuthStatus.AUTHENTICATED,
        profile: { firstName: 'Jane', lastName: 'Doe' },
        identity: null,
      });

      renderLayout();

      expect(screen.getByRole('button', { name: /sign out/i })).toBeTruthy();
    });

    it('should call logout mutation when Sign out is clicked', async () => {
      const user = userEvent.setup();
      useAuthStore.setState({
        status: AuthStatus.AUTHENTICATED,
        profile: { firstName: 'Jane', lastName: 'Doe' },
        identity: null,
      });

      renderLayout();

      await user.click(screen.getByRole('button', { name: /sign out/i }));

      expect(mockLogoutMutate).toHaveBeenCalledOnce();
    });
  });
});
