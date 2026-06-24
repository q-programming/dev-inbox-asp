import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@test/renderWithProviders';
import { AppRoute } from '@app/routes';
import CtaSection from './CtaSection';

const renderCta = () => renderWithProviders(<CtaSection />);

describe('CtaSection', () => {
  describe('primary CTA', () => {
    it('should link Get Started Free button to the register route', () => {
      renderCta();
      expect(screen.getByTestId('cta-get-started').getAttribute('href')).toBe(AppRoute.REGISTER);
    });

    it('should render the section heading', () => {
      renderCta();
      expect(screen.getByTestId('cta-heading')).toBeTruthy();
    });
  });
});
