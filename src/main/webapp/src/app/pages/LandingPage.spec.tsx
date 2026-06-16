import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@shared/api/queryClient';
import useAuthStore, { AuthStatus } from '@shared/store/auth.store';
import { AppRoute } from '@app/routes';
import LandingPage from './LandingPage';

const mockUseMeQuery = vi.hoisted(() => vi.fn());

vi.mock('@shared/hooks/useAuthQuery', () => ({
  useMeQuery: mockUseMeQuery,
}));

const mockUser = {
  id: 1,
  email: 'user@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  accountType: 'REGULAR',
};

function renderLandingPage() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[AppRoute.HOME]}>
        <LandingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useAuthStore.setState({ status: AuthStatus.UNAUTHENTICATED, profile: null, identity: null });
  mockUseMeQuery.mockReturnValue({ data: undefined, isSuccess: false });
});

describe('LandingPage', () => {
  describe('redirect when authenticated via store', () => {
    it('should not render landing content when profile is present and status is not UNAUTHENTICATED', () => {
      useAuthStore.setState({
        status: AuthStatus.AUTHENTICATED,
        profile: { firstName: 'Jane', lastName: 'Doe' },
        identity: null,
      });

      renderLandingPage();

      expect(screen.queryByRole('link', { name: /sign in/i })).toBeFalsy();
    });

    it('should render landing content when profile is present but status is UNAUTHENTICATED', () => {
      useAuthStore.setState({
        status: AuthStatus.UNAUTHENTICATED,
        profile: { firstName: 'Jane', lastName: 'Doe' },
        identity: null,
      });

      renderLandingPage();

      expect(screen.getByRole('link', { name: /sign in/i })).toBeTruthy();
    });
  });

  describe('redirect via /me query (OAuth callback)', () => {
    it('should not render landing content when /me returns a user', () => {
      mockUseMeQuery.mockReturnValue({ data: mockUser, isSuccess: true });

      renderLandingPage();

      expect(screen.queryByRole('link', { name: /sign in/i })).toBeFalsy();
    });

    it('should render landing content when /me returns null', () => {
      mockUseMeQuery.mockReturnValue({ data: null, isSuccess: true });

      renderLandingPage();

      expect(screen.getByRole('link', { name: /sign in/i })).toBeTruthy();
    });
  });

  describe('navigation links', () => {
    it('should point Sign in link to the login route', () => {
      renderLandingPage();
      expect(screen.getByRole('link', { name: /sign in/i }).getAttribute('href')).toBe(
        AppRoute.LOGIN,
      );
    });

    it('should point Sign up link to the register route', () => {
      renderLandingPage();
      expect(screen.getByRole('link', { name: /sign up/i }).getAttribute('href')).toBe(
        AppRoute.REGISTER,
      );
    });

    it('should point Get started link to the register route', () => {
      renderLandingPage();
      expect(screen.getByRole('link', { name: /get started/i }).getAttribute('href')).toBe(
        AppRoute.REGISTER,
      );
    });
  });
});
