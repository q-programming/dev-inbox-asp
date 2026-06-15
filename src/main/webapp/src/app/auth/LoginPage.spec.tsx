import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '@test/setupBrowserTests';
import { createQueryClient } from '@shared/api/queryClient';
import useAuthStore, { AuthStatus } from '@shared/store/auth.store';
import { AppRoute } from '@app/routes';
import LoginPage from './LoginPage';

// Hoist navigate mock so it is available inside the vi.mock factory.
const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useNavigate: () => mockNavigate };
});

const mockUser = {
  id: 1,
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  accountType: 'REGULAR',
};

function renderLoginPage() {
  const client = createQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[AppRoute.LOGIN]}>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  mockNavigate.mockClear();
  useAuthStore.setState({ status: AuthStatus.UNAUTHENTICATED, profile: null, identity: null });
});

describe('LoginPage', () => {
  describe('redirect when already authenticated', () => {
    it('should not render the login form when user is already authenticated', () => {
      useAuthStore.setState({
        status: AuthStatus.AUTHENTICATED,
        profile: { firstName: 'John', lastName: 'Doe' },
        identity: { id: 1, email: 'test@example.com', accountType: 'REGULAR' },
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

      await waitFor(() => expect(useAuthStore.getState().status).toBe(AuthStatus.AUTHENTICATED));
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

      await waitFor(() => expect(useAuthStore.getState().status).toBe(AuthStatus.UNAUTHENTICATED));
      expect(screen.getByLabelText(/email/i)).toBeTruthy();
      expect(mockNavigate).not.toHaveBeenCalledWith(AppRoute.INBOX);
    });
  });

  describe('GitHub OAuth link', () => {
    it('should render the Sign in with GitHub link', () => {
      renderLoginPage();
      expect(screen.getByText(/sign in with github/i)).toBeTruthy();
    });

    it('should point to the GitHub OAuth authorization URL', () => {
      renderLoginPage();
      const link = screen.getByRole('link', { name: /sign in with github/i });
      expect(link.getAttribute('href')).toContain('/oauth2/authorization/github');
    });
  });
});
