import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@test/renderWithProviders';
import useAuthStore, { AuthStatus } from '@shared/store/auth.store';
import { Theme } from '@shared/theme/theme';
import { AppRoute } from '@app/routes';
import Footer from './Footer';

const lightProfile = { firstName: '', lastName: '', theme: Theme.LIGHT };
const darkProfile = { firstName: '', lastName: '', theme: Theme.DARK };

const renderFooter = () => renderWithProviders(<Footer />);

beforeEach(() => {
  useAuthStore.setState({
    status: AuthStatus.UNAUTHENTICATED,
    profile: lightProfile,
    identity: null,
  });
});

describe('Footer', () => {
  describe('brand link', () => {
    it('should link the Dev Inbox logo+wordmark to the home route', () => {
      renderFooter();
      const link = screen.getByRole('link', { name: /dev inbox/i });
      expect(link.getAttribute('href')).toBe(AppRoute.HOME);
    });
  });

  describe('theme toggle', () => {
    it('should show the dark mode icon when theme is LIGHT', () => {
      useAuthStore.setState({ profile: lightProfile });
      renderFooter();
      expect(screen.getByLabelText('Toggle Dark mode')).toBeTruthy();
    });

    it('should show the light mode icon when theme is DARK', () => {
      useAuthStore.setState({ profile: darkProfile });
      renderFooter();
      expect(screen.getByLabelText('Toggle Light mode')).toBeTruthy();
    });

    it('should call toggleTheme when the theme toggle button is clicked', async () => {
      const user = userEvent.setup();
      renderFooter();

      await user.click(screen.getByTestId('theme-toggle'));

      // After click on LIGHT theme, store should switch to DARK
      expect(useAuthStore.getState().profile.theme).toBe(Theme.DARK);
    });

    it('should toggle back from DARK to LIGHT on second click', async () => {
      useAuthStore.setState({ profile: darkProfile });
      const user = userEvent.setup();
      renderFooter();

      await user.click(screen.getByTestId('theme-toggle'));

      expect(useAuthStore.getState().profile.theme).toBe(Theme.LIGHT);
    });
  });
});
