import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@test/renderWithProviders';
import AppearanceSection from './AppearanceSection';
import useUserStore, { AuthStatus } from '@shared/store/user.store';
import useSettingsStore from '@feature/settings/store/settings.store';
import { Density, Theme } from '@shared/theme/theme';

beforeEach(() => {
  useUserStore.setState({
    status: AuthStatus.AUTHENTICATED,
    firstName: 'Jane',
    lastName: 'Dev',
    identity: null,
  });
  useSettingsStore.setState({ theme: Theme.LIGHT, density: Density.RELAXED, fontSize: 14 });
});

describe('AppearanceSection', () => {
  describe('theme selection', () => {
    it('calls toggleTheme when the non-active theme card is clicked', async () => {
      const user = userEvent.setup();
      const mockToggleTheme = vi.fn();
      useSettingsStore.setState({ toggleTheme: mockToggleTheme });
      renderWithProviders(<AppearanceSection />);
      await user.click(screen.getByTestId('theme-card-dark'));
      expect(mockToggleTheme).toHaveBeenCalledOnce();
    });

    it('does not call toggleTheme when the already-active theme card is clicked', async () => {
      const user = userEvent.setup();
      const mockToggleTheme = vi.fn();
      useSettingsStore.setState({ toggleTheme: mockToggleTheme });
      renderWithProviders(<AppearanceSection />);
      await user.click(screen.getByTestId('theme-card-light'));
      expect(mockToggleTheme).not.toHaveBeenCalled();
    });

    it('marks the current theme card as pressed', () => {
      renderWithProviders(<AppearanceSection />);
      expect(screen.getByTestId('theme-card-light')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('theme-card-dark')).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('density selection', () => {
    it('calls switchDensity with the correct value when a density card is clicked', async () => {
      const user = userEvent.setup();
      const mockSwitchDensity = vi.fn();
      useSettingsStore.setState({ switchDensity: mockSwitchDensity });
      renderWithProviders(<AppearanceSection />);
      await user.click(screen.getByTestId(`density-card-${Density.TIGHT}`));
      expect(mockSwitchDensity).toHaveBeenCalledWith(Density.TIGHT);
    });

    it('marks the current density card as pressed', () => {
      renderWithProviders(<AppearanceSection />);
      expect(screen.getByTestId(`density-card-${Density.RELAXED}`)).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(screen.getByTestId(`density-card-${Density.TIGHT}`)).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    });
  });

  describe('font size slider', () => {
    it('calls changeFontSize when the slider value changes', () => {
      const mockChangeFontSize = vi.fn();
      useSettingsStore.setState({ changeFontSize: mockChangeFontSize });
      renderWithProviders(<AppearanceSection />);
      fireEvent.change(screen.getByRole('slider', { name: /ui font size/i }), {
        target: { value: '16' },
      });
      expect(mockChangeFontSize).toHaveBeenCalledWith(16);
    });

    it('initialises the slider with the stored font size', () => {
      useSettingsStore.setState({ fontSize: 17 });
      renderWithProviders(<AppearanceSection />);
      expect(screen.getByRole('slider', { name: /ui font size/i })).toHaveAttribute(
        'aria-valuenow',
        '17',
      );
    });
  });
});
