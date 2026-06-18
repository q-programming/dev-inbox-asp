import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@test/renderWithProviders';
import useUserStore, { AuthStatus } from '@shared/store/user.store.ts';
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

const renderLandingPage = () =>
  renderWithProviders(<LandingPage />, { initialEntries: [AppRoute.HOME] });

beforeEach(() => {
  useUserStore.setState({
    status: AuthStatus.UNAUTHENTICATED,
    identity: null,
  });
  mockUseMeQuery.mockReturnValue({ data: undefined, isSuccess: false });
});

describe('LandingPage', () => {
  describe('redirect when authenticated via store', () => {
    it('should not render landing content when status is AUTHENTICATED', () => {
      useUserStore.setState({
        status: AuthStatus.AUTHENTICATED,
        firstName: 'Jane',
        lastName: 'Doe',
        identity: null,
      });

      renderLandingPage();

      expect(screen.queryByTestId('header-login')).toBeFalsy();
    });

    it('should render landing content when status is UNAUTHENTICATED', () => {
      useUserStore.setState({
        status: AuthStatus.UNAUTHENTICATED,
        identity: null,
      });

      renderLandingPage();

      expect(screen.getByTestId('header-login')).toBeTruthy();
    });
  });

  describe('redirect via /me query (OAuth callback)', () => {
    it('should not render landing content when /me returns a user', () => {
      mockUseMeQuery.mockReturnValue({ data: mockUser, isSuccess: true });

      renderLandingPage();

      expect(screen.queryByTestId('header-login')).toBeFalsy();
    });

    it('should render landing content when /me returns null', () => {
      mockUseMeQuery.mockReturnValue({ data: null, isSuccess: true });

      renderLandingPage();

      expect(screen.getByTestId('header-login')).toBeTruthy();
    });
  });

  describe('navigation links', () => {
    it('should point Login link to the login route', () => {
      renderLandingPage();
      expect(screen.getByTestId('header-login').getAttribute('href')).toBe(AppRoute.LOGIN);
    });

    it('should point Get Started header link to the register route', () => {
      renderLandingPage();
      expect(screen.getByTestId('header-get-started').getAttribute('href')).toBe(AppRoute.REGISTER);
    });

    it('should point hero CTA link to the register route', () => {
      renderLandingPage();
      expect(screen.getByTestId('hero-get-started').getAttribute('href')).toBe(AppRoute.REGISTER);
    });
  });
});
