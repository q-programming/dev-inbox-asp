import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@test/setupBrowserTests';
import { renderWithProviders } from '@test/renderWithProviders';
import useUserStore, { AuthStatus } from '@shared/store/user.store.ts';
import { AppRoute } from '@app/routes';
import LoginPage from './LoginPage';
import { AccountType } from '@api';

// Hoist navigate mock so it is available inside the vi.mock factory.
const mockNavigate = vi.hoisted(() => vi.fn());
const mockRedirectTo = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useNavigate: () => mockNavigate };
});

vi.mock('@shared/utils/navigation', () => ({
  redirectTo: mockRedirectTo,
  consumeReturnPath: () => null,
  saveReturnPath: vi.fn(),
}));

const mockUser = {
  id: 1,
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  accountType: 'REGULAR',
};

const renderLoginPage = () =>
  renderWithProviders(<LoginPage />, { initialEntries: [AppRoute.LOGIN] });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  mockNavigate.mockClear();
  mockRedirectTo.mockClear();
  useUserStore.setState({
    status: AuthStatus.UNAUTHENTICATED,
    identity: null,
  });
});

describe('LoginPage', () => {
  describe('redirect when already authenticated', () => {
    it('should not render the login form when user is already authenticated', () => {
      useUserStore.setState({
        status: AuthStatus.AUTHENTICATED,
        firstName: 'John',
        lastName: 'Doe',
        identity: { id: 1, email: 'test@example.com', accountType: AccountType.REGULAR },
      });

      renderLoginPage();

      expect(screen.queryByLabelText(/email/i)).toBeFalsy();
      expect(screen.queryByRole('button', { name: /sign in/i })).toBeFalsy();
    });
  });

  describe('form validation', () => {
    it('should show email validation error when email field is empty', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(await screen.findByText('Enter a valid email')).toBeTruthy();
    });

    it('should show email validation error when email format is invalid', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'not-an-email');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(await screen.findByText('Enter a valid email')).toBeTruthy();
    });

    it('should show password required error when password is empty', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'valid@example.com');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(await screen.findByText('Password is required')).toBeTruthy();
    });
  });

  describe('successful login', () => {
    it('should navigate to inbox after a successful login', async () => {
      server.use(http.post('/api/auth/login', () => HttpResponse.json(mockUser)));
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'correctpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(AppRoute.INBOX));
    });

    it('should update auth store to AUTHENTICATED after successful login', async () => {
      server.use(http.post('/api/auth/login', () => HttpResponse.json(mockUser)));
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'correctpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => expect(useUserStore.getState().status).toBe(AuthStatus.AUTHENTICATED));
    });
  });

  describe('failed login', () => {
    it('should keep the form visible when the API returns 401', async () => {
      server.use(http.post('/api/auth/login', () => HttpResponse.json({}, { status: 401 })));
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => expect(useUserStore.getState().status).toBe(AuthStatus.UNAUTHENTICATED));
      expect(screen.getByLabelText(/email/i)).toBeTruthy();
      expect(mockNavigate).not.toHaveBeenCalledWith(AppRoute.INBOX);
    });

    it('should show error message when login fails', async () => {
      server.use(http.post('/api/auth/login', () => HttpResponse.json({}, { status: 401 })));
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(await screen.findByTestId('login-error')).toBeTruthy();
    });
  });

  describe('GitHub OAuth', () => {
    it('should render the Continue with GitHub button', () => {
      renderLoginPage();
      expect(screen.getByRole('button', { name: /continue with github/i })).toBeTruthy();
    });

    it('should show spinner and Redirecting text after GitHub button is clicked', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await user.click(screen.getByRole('button', { name: /continue with github/i }));

      expect(await screen.findByText(/redirecting/i)).toBeTruthy();
    });

    it('should disable the GitHub button after it is clicked', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await user.click(screen.getByRole('button', { name: /continue with github/i }));

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /redirecting/i })).toBeDisabled(),
      );
    });

    it('should disable the sign-in button when GitHub redirect is in progress', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await user.click(screen.getByRole('button', { name: /continue with github/i }));

      await waitFor(() => expect(screen.getByTestId('login-submit')).toBeDisabled());
    });

    it('should call redirectTo with the GitHub OAuth URL', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await user.click(screen.getByRole('button', { name: /continue with github/i }));

      await waitFor(() =>
        expect(mockRedirectTo).toHaveBeenCalledWith(expect.stringContaining('/api/auth/github')),
      );
    });
  });
});
