import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@test/renderWithProviders';
import AppearanceSection from './AppearanceSection';
import useUserStore, { AuthStatus } from '@shared/store/user.store';
import { Density, Theme } from '@shared/theme/theme';

const baseProfile = {
  firstName: 'Jane',
  lastName: 'Dev',
  theme: Theme.LIGHT,
  density: Density.RELAXED,
  fontSize: 14,
};

beforeEach(() => {
  useUserStore.setState({ status: AuthStatus.AUTHENTICATED, profile: baseProfile, identity: null });
});

describe('AppearanceSection', () => {
  describe('theme selection', () => {
    it('calls toggleTheme when the non-active theme card is clicked', async () => {
      const user = userEvent.setup();
      const mockToggleTheme = vi.fn();
      useUserStore.setState({ toggleTheme: mockToggleTheme });
      renderWithProviders(<AppearanceSection />);
      await user.click(screen.getByTestId('theme-card-dark'));
      expect(mockToggleTheme).toHaveBeenCalledOnce();
    });

    it('does not call toggleTheme when the already-active theme card is clicked', async () => {
      const user = userEvent.setup();
      const mockToggleTheme = vi.fn();
      useUserStore.setState({ toggleTheme: mockToggleTheme });
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
      useUserStore.setState({ switchDensity: mockSwitchDensity });
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
      useUserStore.setState({ changeFontSize: mockChangeFontSize });
      renderWithProviders(<AppearanceSection />);
      fireEvent.change(screen.getByRole('slider', { name: /ui font size/i }), {
        target: { value: '16' },
      });
      expect(mockChangeFontSize).toHaveBeenCalledWith(16);
    });

    it('initialises the slider with the stored font size', () => {
      useUserStore.setState({ profile: { ...baseProfile, fontSize: 17 } });
      renderWithProviders(<AppearanceSection />);
      expect(screen.getByRole('slider', { name: /ui font size/i })).toHaveAttribute(
        'aria-valuenow',
        '17',
      );
    });
  });
});
