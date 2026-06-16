import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@test/renderWithProviders';
import { AppRoute } from '@app/routes';
import HeroSection from './HeroSection';

const renderHero = () => renderWithProviders(<HeroSection />);

describe('HeroSection', () => {
  describe('primary CTA', () => {
    it('should link Get Started button to the register route', () => {
      renderHero();
      expect(screen.getByTestId('hero-get-started').getAttribute('href')).toBe(AppRoute.REGISTER);
    });
  });

  describe('version badge', () => {
    it('should render the version badge', () => {
      renderHero();
      expect(screen.getByTestId('hero-version-badge')).toBeTruthy();
    });

    it('should display the app version from Vite define', () => {
      renderHero();
      // __APP_VERSION__ is injected at build/test time — badge text must contain it
      expect(screen.getByTestId('hero-version-badge').textContent).toContain(__APP_VERSION__);
    });
  });

  describe('screenshot', () => {
    it('should render the inbox screenshot image', () => {
      renderHero();
      const img = screen.getByTestId('hero-screenshot');
      expect(img.getAttribute('src')).toBe('/inbox.png');
    });
  });
});
