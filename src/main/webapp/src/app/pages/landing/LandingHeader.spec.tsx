import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@test/renderWithProviders';
import { AppRoute } from '@app/routes';
import LandingHeader from './LandingHeader';

const renderHeader = () => renderWithProviders(<LandingHeader />);

describe('LandingHeader', () => {
  describe('auth navigation', () => {
    it('should link Login button to the login route', () => {
      renderHeader();
      expect(screen.getByTestId('header-login').getAttribute('href')).toBe(AppRoute.LOGIN);
    });

    it('should link Get Started button to the register route', () => {
      renderHeader();
      expect(screen.getByTestId('header-get-started').getAttribute('href')).toBe(AppRoute.REGISTER);
    });
  });

  describe('branding', () => {
    it('should render the logo image', () => {
      renderHeader();
      expect(screen.getByTestId('header-logo')).toBeTruthy();
    });

    it('should render the Dev Inbox wordmark', () => {
      renderHeader();
      expect(screen.getByTestId('header-wordmark')).toBeTruthy();
    });
  });
});
