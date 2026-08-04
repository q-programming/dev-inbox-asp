import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@test/renderWithProviders.tsx';
import useUserStore, { AuthStatus } from '@shared/store/user.store.ts';
import useSettingsStore from '@feature/settings/store/settings.store';
import { Theme } from '@api';
import { AppRoute } from '@app/routes.ts';
import Footer from './Footer.tsx';

const renderFooter = () => renderWithProviders(<Footer />);

beforeEach(() => {
  useUserStore.setState({
    status: AuthStatus.UNAUTHENTICATED,
    firstName: '',
    lastName: '',
    identity: null,
  });
  useSettingsStore.setState({ theme: Theme.Light });
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
    it('should show the light mode button selected when theme is LIGHT', () => {
      useSettingsStore.setState({ theme: Theme.Light });
      renderFooter();
      expect(screen.getAllByTestId('theme-toggle').length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: /light mode/i }).length).toBeGreaterThan(0);
    });

    it('should show the dark mode button selected when theme is DARK', () => {
      useSettingsStore.setState({ theme: Theme.Dark });
      renderFooter();
      expect(screen.getAllByRole('button', { name: /dark mode/i }).length).toBeGreaterThan(0);
    });

    it('should call toggleTheme when the dark mode button is clicked', async () => {
      const user = userEvent.setup();
      renderFooter();

      await user.click(screen.getAllByRole('button', { name: /dark mode/i })[0]);

      expect(useSettingsStore.getState().theme).toBe(Theme.Dark);
    });

    it('should toggle back from DARK to LIGHT when light mode button is clicked', async () => {
      useSettingsStore.setState({ theme: Theme.Dark });
      const user = userEvent.setup();
      renderFooter();

      await user.click(screen.getAllByRole('button', { name: /light mode/i })[0]);

      expect(useSettingsStore.getState().theme).toBe(Theme.Light);
    });

    it('should not be visible for authenticated users', () => {
      useUserStore.setState({ status: AuthStatus.AUTHENTICATED });
      renderFooter();
      expect(screen.queryByTestId('theme-toggle')).toBeNull();
    });
  });
});
