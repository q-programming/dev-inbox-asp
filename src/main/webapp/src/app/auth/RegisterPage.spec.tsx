import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@test/setupBrowserTests';
import { renderWithProviders } from '@test/renderWithProviders';
import useAuthStore, { AuthStatus } from '@shared/store/auth.store';
import { Theme } from '@shared/theme/theme';
import { AppRoute } from '@app/routes';
import RegisterPage from './RegisterPage';

// Hoist navigate mock so it is available inside the vi.mock factory.
const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useNavigate: () => mockNavigate };
});

const mockUser = {
  id: 2,
  email: 'new@example.com',
  firstName: 'New',
  lastName: 'User',
  accountType: 'REGULAR',
};

const emptyProfile = { firstName: '', lastName: '', theme: Theme.LIGHT };

const renderRegisterPage = () =>
  renderWithProviders(<RegisterPage />, { initialEntries: [AppRoute.REGISTER] });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  mockNavigate.mockClear();
  useAuthStore.setState({
    status: AuthStatus.UNAUTHENTICATED,
    profile: emptyProfile,
    identity: null,
  });
});

describe('RegisterPage', () => {
  describe('redirect when already authenticated', () => {
    it('should not render the register form when user is already authenticated', () => {
      useAuthStore.setState({
        status: AuthStatus.AUTHENTICATED,
        profile: { firstName: 'John', lastName: 'Doe', theme: Theme.LIGHT },
        identity: { id: 1, email: 'test@example.com', accountType: 'REGULAR' },
      });

      renderRegisterPage();

      expect(screen.queryByRole('button', { name: /create account/i })).toBeFalsy();
    });
  });

  describe('form validation', () => {
    it('should show error when first name is empty', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(await screen.findByText('First name is required')).toBeTruthy();
    });

    it('should show error when last name is empty', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(await screen.findByText('Last name is required')).toBeTruthy();
    });

    it('should show email validation error when email format is invalid', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email/i), 'not-valid');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(await screen.findByText('Enter a valid email')).toBeTruthy();
    });

    it('should show error when password is shorter than 8 characters', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/password/i), 'short');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(await screen.findByText('Password must be at least 8 characters')).toBeTruthy();
    });
  });

  describe('successful registration', () => {
    it('should navigate to login after successful registration', async () => {
      server.use(
        http.post('/api/auth/register', () => HttpResponse.json(mockUser, { status: 201 })),
      );
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText(/first name/i), 'New');
      await user.type(screen.getByLabelText(/last name/i), 'User');
      await user.type(screen.getByLabelText(/email/i), 'new@example.com');
      await user.type(screen.getByLabelText(/password/i), 'SecretPass1!');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(AppRoute.LOGIN));
    });
  });

  describe('registration failure', () => {
    it('should not navigate when API returns 409 (duplicate email)', async () => {
      server.use(http.post('/api/auth/register', () => HttpResponse.json({}, { status: 409 })));
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/password/i), 'SecretPass1!');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /^create account$/i })).not.toBeDisabled(),
      );
      expect(mockNavigate).not.toHaveBeenCalledWith(AppRoute.LOGIN);
    });

    it('should show error message when registration fails', async () => {
      server.use(http.post('/api/auth/register', () => HttpResponse.json({}, { status: 409 })));
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
      await user.type(screen.getByLabelText(/password/i), 'SecretPass1!');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(await screen.findByTestId('register-error')).toBeTruthy();
    });
  });

  describe('GitHub OAuth link', () => {
    it('should render the Continue with GitHub link', () => {
      renderRegisterPage();
      expect(screen.getByText(/continue with github/i)).toBeTruthy();
    });

    it('should point to the GitHub OAuth authorization URL', () => {
      renderRegisterPage();
      const link = screen.getByRole('link', { name: /continue with github/i });
      expect(link.getAttribute('href')).toContain('/oauth2/authorization/github');
    });
  });
});
